import { ApiError, type ApiClient } from '@/api/client';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { publicEnvironment } from '@/config/environment';
import { IntegrationPendingError } from '@/services/integration';
import type {
  CapturedMedicineImage,
  OcrRecognitionResult,
  ReviewedMedicine,
} from '@/types/medication';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type OcrWorkflowFailureCode =
  | 'local_file_unavailable'
  | 'local_file_metadata_invalid'
  | 'local_file_empty'
  | 'local_file_too_large'
  | 'local_file_read_failed'
  | 'local_file_read_timeout'
  | 'binary_body_creation_failed'
  | 'capture_initiation_timeout'
  | 'capture_initiation_failed'
  | 'capture_idempotency_conflict'
  | 'capture_already_advanced'
  | 'upload_timeout'
  | 'upload_failed'
  | 'completion_timeout'
  | 'processing_timeout'
  | 'cancelled';

export class OcrWorkflowError extends IntegrationPendingError {
  constructor(public readonly code: OcrWorkflowFailureCode) {
    super('Medicine recognition');
    this.name = 'OcrWorkflowError';
  }
}

type OcrTimeouts = Readonly<{
  localReadMs: number;
  initiationMs: number;
  uploadMs: number;
  completionMs: number;
  processingMs: number;
}>;

const DEFAULT_TIMEOUTS: OcrTimeouts = {
  localReadMs: 10_000,
  initiationMs: 15_000,
  uploadMs: 30_000,
  completionMs: 15_000,
  processingMs: 45_000,
};

export type OcrStage =
  | 'local_file_check_started'
  | 'local_file_exists'
  | 'local_file_metadata_valid'
  | 'local_file_read_started'
  | 'local_file_read_completed'
  | 'binary_body_created'
  | 'capture_initiation_started'
  | 'capture_initiation_completed'
  | 'upload_started'
  | 'upload_completed'
  | 'completion_started'
  | 'completion_completed'
  | 'polling_started'
  | 'review_ready'
  | 'outcome:no_match'
  | 'outcome:retake_required'
  | 'outcome:failed_safe'
  | 'outcome:expired'
  | `failed:${OcrWorkflowFailureCode}`;

const noStageReporting = (_stage: OcrStage): void => undefined;

export const reportDevelopmentOcrStage = (stage: OcrStage): void => {
  if (!publicEnvironment.developerDiagnostics) return;
  // Stage is a closed non-sensitive union. Never add dynamic values here.
  // eslint-disable-next-line no-console
  console.info(`OCR_STAGE ${stage}`);
};

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new OcrWorkflowError('cancelled');
};

const runBounded = <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutCode: OcrWorkflowFailureCode,
  externalSignal?: AbortSignal,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
      callback();
    };
    const onExternalAbort = () => {
      controller.abort();
      finish(() => reject(new OcrWorkflowError('cancelled')));
    };
    const timer = setTimeout(() => {
      controller.abort();
      finish(() => reject(new OcrWorkflowError(timeoutCode)));
    }, timeoutMs);
    if (externalSignal?.aborted) {
      onExternalAbort();
      return;
    }
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });
    Promise.resolve()
      .then(() => operation(controller.signal))
      .then(
        (value) => finish(() => resolve(value)),
        (error) => finish(() => reject(error)),
      );
  });

type InitiatedCapture = {
  capture_id: string;
  state: string;
  upload_url: string;
  required_headers: Record<string, string>;
};
type BackendCandidate = {
  candidate_id: string;
  name: string;
  strengths: string[];
  dosage_form: string | null;
  confidence: number;
};
type CaptureResult = {
  capture_id: string;
  state: string;
  quality_reasons: string[];
  failure_code: string | null;
  candidates: BackendCandidate[];
  extracted_medicine: {
    medicine_name: string;
    strength: string | null;
    dosage_form: string | null;
    active_ingredient: string | null;
    manufacturer: string | null;
  } | null;
};

export interface OcrService {
  recognize(
    image: CapturedMedicineImage,
    signal?: AbortSignal,
  ): Promise<OcrRecognitionResult>;
  decideOutcome?(
    captureId: string,
    action: 'none_of_these' | 'reject',
  ): Promise<void>;
  confirmReview?(captureId: string, medicine: ReviewedMedicine): Promise<void>;
  cancel?(captureId: string): Promise<void>;
}

export class PendingOcrService implements OcrService {
  async recognize(): Promise<OcrRecognitionResult> {
    throw new IntegrationPendingError('Medicine OCR');
  }
}

export class DevelopmentOcrService implements OcrService {
  async recognize(): Promise<OcrRecognitionResult> {
    throw new IntegrationPendingError(
      'Development OCR fixtures are isolated from real image capture',
    );
  }
}

const wait = (milliseconds: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new IntegrationPendingError('Medicine recognition was cancelled'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timeout);
      reject(new IntegrationPendingError('Medicine recognition was cancelled'));
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
export type PreparedLocalImage = Readonly<{
  bytes: Uint8Array<ArrayBuffer>;
  size: number;
}>;

export const readLocalImage = async (
  image: CapturedMedicineImage,
  signal?: AbortSignal,
  reportStage: (stage: OcrStage) => void = noStageReporting,
): Promise<PreparedLocalImage> => {
  throwIfAborted(signal);
  reportStage('local_file_check_started');
  if (!['image/jpeg', 'image/png'].includes(image.mediaType))
    throw new OcrWorkflowError('local_file_metadata_invalid');
  if (
    !image.uri.startsWith('file://') ||
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width < 1 ||
    image.height < 1 ||
    !image.idempotencyKey
  )
    throw new OcrWorkflowError('local_file_metadata_invalid');
  let file: File;
  try {
    file = new File(image.uri);
  } catch {
    throw new OcrWorkflowError('local_file_unavailable');
  }
  if (!file.exists) throw new OcrWorkflowError('local_file_unavailable');
  reportStage('local_file_exists');
  const size = file.size;
  if (!Number.isInteger(size) || size < 0)
    throw new OcrWorkflowError('local_file_metadata_invalid');
  if (size === 0) throw new OcrWorkflowError('local_file_empty');
  if (size > MAX_IMAGE_BYTES)
    throw new OcrWorkflowError('local_file_too_large');
  reportStage('local_file_metadata_valid');
  reportStage('local_file_read_started');
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = await file.bytes();
  } catch {
    throw new OcrWorkflowError('local_file_read_failed');
  }
  throwIfAborted(signal);
  if (!(bytes instanceof Uint8Array))
    throw new OcrWorkflowError('binary_body_creation_failed');
  if (bytes.byteLength !== size)
    throw new OcrWorkflowError('local_file_read_failed');
  reportStage('local_file_read_completed');
  reportStage('binary_body_created');
  return { bytes, size };
};

type UploadFetcher = (
  url: string,
  init: RequestInit,
) => Promise<Readonly<{ ok: boolean }>>;

export class BackendOcrService implements OcrService {
  constructor(
    private readonly api: ApiClient,
    private readonly fetcher: UploadFetcher = expoFetch,
    private readonly pollDelayMs = 750,
    private readonly maxPolls = 40,
    private readonly localImageReader: (
      image: CapturedMedicineImage,
      signal?: AbortSignal,
      reportStage?: (stage: OcrStage) => void,
    ) => Promise<PreparedLocalImage> = readLocalImage,
    private readonly timeouts: OcrTimeouts = DEFAULT_TIMEOUTS,
    private readonly stageReporter: (
      stage: OcrStage,
    ) => void = reportDevelopmentOcrStage,
  ) {}

  async recognize(
    image: CapturedMedicineImage,
    signal?: AbortSignal,
  ): Promise<OcrRecognitionResult> {
    try {
      return await this.recognizeInternal(image, signal);
    } catch (error) {
      if (error instanceof OcrWorkflowError)
        this.stageReporter(`failed:${error.code}`);
      throw error;
    }
  }

  private async recognizeInternal(
    image: CapturedMedicineImage,
    signal?: AbortSignal,
  ): Promise<OcrRecognitionResult> {
    throwIfAborted(signal);
    let prepared: PreparedLocalImage;
    try {
      prepared = await runBounded(
        (stageSignal) =>
          this.localImageReader(image, stageSignal, this.stageReporter),
        this.timeouts.localReadMs,
        'local_file_read_timeout',
        signal,
      );
    } catch (error) {
      if (error instanceof OcrWorkflowError) throw error;
      throw new OcrWorkflowError('local_file_read_failed');
    }
    if (
      !(prepared.bytes instanceof Uint8Array) ||
      prepared.size !== prepared.bytes.byteLength
    )
      throw new OcrWorkflowError('binary_body_creation_failed');
    this.stageReporter('capture_initiation_started');
    let initiated: InitiatedCapture;
    try {
      initiated = await runBounded(
        (stageSignal) =>
          this.api.request<InitiatedCapture>(
            '/api/v1/medicine-captures',
            {
              method: 'POST',
              signal: stageSignal,
              body: JSON.stringify({
                source: image.source,
                media_type: image.mediaType,
                size_bytes: prepared.size,
                width: image.width,
                height: image.height,
                idempotency_key: image.idempotencyKey,
              }),
            },
            true,
          ),
        this.timeouts.initiationMs,
        'capture_initiation_timeout',
        signal,
      );
    } catch (error) {
      if (error instanceof OcrWorkflowError) throw error;
      if (error instanceof ApiError && [401, 403].includes(error.status))
        throw error;
      if (error instanceof ApiError && error.code === 'REQUEST_TIMEOUT')
        throw new OcrWorkflowError('capture_initiation_timeout');
      if (
        error instanceof ApiError &&
        error.code === 'CAPTURE_IDEMPOTENCY_CONFLICT'
      )
        throw new OcrWorkflowError('capture_idempotency_conflict');
      if (
        error instanceof ApiError &&
        error.code === 'CAPTURE_ALREADY_ADVANCED'
      )
        throw new OcrWorkflowError('capture_already_advanced');
      throw new OcrWorkflowError('capture_initiation_failed');
    }
    this.stageReporter('capture_initiation_completed');
    try {
      this.stageReporter('upload_started');
      let uploaded: Readonly<{ ok: boolean }>;
      try {
        uploaded = await runBounded(
          (stageSignal) =>
            this.fetcher(initiated.upload_url, {
              method: 'PUT',
              headers: initiated.required_headers,
              body: prepared.bytes,
              signal: stageSignal,
            }),
          this.timeouts.uploadMs,
          'upload_timeout',
          signal,
        );
      } catch (error) {
        if (error instanceof OcrWorkflowError) throw error;
        throw new OcrWorkflowError('upload_failed');
      }
      if (!uploaded.ok) throw new OcrWorkflowError('upload_failed');
      this.stageReporter('upload_completed');
      this.stageReporter('completion_started');
      let completionResult: CaptureResult;
      try {
        completionResult = await runBounded(
          (stageSignal) =>
            this.requestResult(
              `/api/v1/medicine-captures/${encodeURIComponent(initiated.capture_id)}/complete`,
              { method: 'POST', signal: stageSignal },
              stageSignal,
            ),
          this.timeouts.completionMs,
          'completion_timeout',
          signal,
        );
      } catch (error) {
        if (
          error instanceof OcrWorkflowError ||
          !(error instanceof ApiError) ||
          error.code !== 'REQUEST_TIMEOUT'
        )
          throw error;
        throw new OcrWorkflowError('completion_timeout');
      }
      this.stageReporter('completion_completed');
      this.stageReporter('polling_started');
      const recognitionResult = await runBounded(
        (stageSignal) =>
          this.pollForCandidate(
            initiated.capture_id,
            completionResult,
            stageSignal,
          ),
        this.timeouts.processingMs,
        'processing_timeout',
        signal,
      );
      this.stageReporter(
        recognitionResult.kind === 'review_ready'
          ? 'review_ready'
          : `outcome:${recognitionResult.kind}`,
      );
      return recognitionResult;
    } catch (error) {
      if (error instanceof OcrWorkflowError && error.code === 'cancelled')
        await this.cancelCapture(initiated.capture_id);
      if (error instanceof OcrWorkflowError) throw error;
      throw error;
    }
  }

  private async pollForCandidate(
    captureId: string,
    initial: CaptureResult,
    signal: AbortSignal,
  ): Promise<OcrRecognitionResult> {
    let result = initial;
    for (let count = 0; count <= this.maxPolls; count += 1) {
      throwIfAborted(signal);
      if (result.state === 'review_ready') {
        if (!result.extracted_medicine)
          throw new IntegrationPendingError(
            'Extracted medicine fields are unavailable',
          );
        return {
          kind: 'review_ready',
          captureId: result.capture_id,
          extractedMedicine: {
            medicineName: result.extracted_medicine.medicine_name,
            strength: result.extracted_medicine.strength ?? '',
            dosageForm: result.extracted_medicine.dosage_form ?? '',
            activeIngredient: result.extracted_medicine.active_ingredient ?? '',
            manufacturer: result.extracted_medicine.manufacturer ?? '',
          },
        };
      }
      if (
        result.state === 'no_match' ||
        result.state === 'retake_required' ||
        result.state === 'failed_safe'
      )
        return {
          kind: result.state,
          captureId: result.capture_id,
          qualityReasons: [...result.quality_reasons],
          failureCode: result.failure_code,
        };
      if (result.state === 'expired')
        return {
          kind: 'expired',
          captureId: result.capture_id,
          qualityReasons: [...result.quality_reasons],
          failureCode: result.failure_code,
        };
      if (count === this.maxPolls) break;
      await wait(this.pollDelayMs, signal);
      result = await this.requestResult(
        `/api/v1/medicine-captures/${encodeURIComponent(captureId)}`,
        { signal },
        signal,
      );
    }
    throw new OcrWorkflowError('processing_timeout');
  }

  async decideOutcome(
    captureId: string,
    action: 'none_of_these' | 'reject',
  ): Promise<void> {
    await this.submitDecision(captureId, action, null);
  }

  async confirmReview(
    captureId: string,
    medicine: ReviewedMedicine,
  ): Promise<void> {
    await this.api.request(
      `/api/v1/medicine-captures/${encodeURIComponent(captureId)}/decision`,
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'confirm',
          reviewed_medicine: {
            medicine_name: medicine.medicineName,
            strength: medicine.strength || null,
            dosage_form: medicine.dosageForm || null,
            active_ingredient: medicine.activeIngredient || null,
            manufacturer: medicine.manufacturer || null,
          },
          idempotency_key: `${captureId}:confirm`,
        }),
      },
      true,
    );
  }

  async cancel(captureId: string): Promise<void> {
    await this.cancelCapture(captureId, false);
  }

  private async submitDecision(
    captureId: string,
    action: 'none_of_these' | 'reject',
    candidateId: string | null,
  ): Promise<void> {
    await this.api.request(
      `/api/v1/medicine-captures/${encodeURIComponent(captureId)}/decision`,
      {
        method: 'POST',
        body: JSON.stringify({
          action,
          candidate_id: candidateId,
          idempotency_key: `${captureId}:${action}`,
        }),
      },
      true,
    );
  }

  private async cancelCapture(
    captureId: string,
    bestEffort = true,
  ): Promise<void> {
    try {
      await runBounded(
        (signal) =>
          this.api.request(
            `/api/v1/medicine-captures/${encodeURIComponent(captureId)}/cancel`,
            { method: 'POST', signal },
            true,
          ),
        5_000,
        'cancelled',
      );
    } catch (error) {
      // Best-effort cleanup must not replace the original safe upload failure.
      if (!bestEffort) throw error;
    }
  }

  private async requestResult(
    path: string,
    options: RequestInit,
    signal?: AbortSignal,
  ): Promise<CaptureResult> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.api.request<CaptureResult>(path, options, true);
      } catch (error) {
        const retryable =
          error instanceof ApiError &&
          (error.status === 0 || error.status >= 500) &&
          !signal?.aborted;
        if (!retryable || attempt === 3) throw error;
        await wait(this.pollDelayMs, signal);
      }
    }
    throw new IntegrationPendingError('Medicine recognition is unavailable');
  }
}

export const buildOcrService = (api: ApiClient): OcrService =>
  new BackendOcrService(api);
