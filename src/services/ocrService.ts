import { ApiError, type ApiClient } from '@/api/client';
import { File } from 'expo-file-system';
import { IntegrationPendingError } from '@/services/integration';
import type { CapturedMedicineImage, OcrCandidate } from '@/types/medication';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type OcrWorkflowFailureCode =
  | 'local_file_unavailable'
  | 'local_file_read_timeout'
  | 'capture_initiation_timeout'
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
  | 'local_file_metadata_start'
  | 'local_file_metadata_complete'
  | 'local_file_read_start'
  | 'local_file_read_complete'
  | 'capture_initiation_start'
  | 'capture_initiation_complete'
  | 'upload_start'
  | 'upload_complete'
  | 'completion_start'
  | 'completion_complete'
  | 'polling_start'
  | 'polling_complete';

const noStageReporting = (_stage: OcrStage): void => undefined;

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
};

export interface OcrService {
  recognize(
    image: CapturedMedicineImage,
    signal?: AbortSignal,
  ): Promise<OcrCandidate>;
  decide?(
    candidate: OcrCandidate,
    action: 'confirm' | 'none_of_these' | 'reject',
  ): Promise<void>;
}

export class PendingOcrService implements OcrService {
  async recognize(): Promise<OcrCandidate> {
    throw new IntegrationPendingError('Medicine OCR');
  }
}

export class DevelopmentOcrService implements OcrService {
  async recognize(): Promise<OcrCandidate> {
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
export const readLocalImage = async (
  image: CapturedMedicineImage,
  signal?: AbortSignal,
): Promise<Blob> => {
  throwIfAborted(signal);
  if (!['image/jpeg', 'image/png'].includes(image.mediaType))
    throw new OcrWorkflowError('local_file_unavailable');
  const file = new File(image.uri);
  if (!file.exists) throw new OcrWorkflowError('local_file_unavailable');
  const size = file.size;
  if (size < 1 || size > MAX_IMAGE_BYTES)
    throw new OcrWorkflowError('local_file_unavailable');
  const bytes = await file.bytes();
  throwIfAborted(signal);
  if (bytes.byteLength !== size)
    throw new OcrWorkflowError('local_file_unavailable');
  return new Blob([bytes], { type: image.mediaType });
};

export class BackendOcrService implements OcrService {
  constructor(
    private readonly api: ApiClient,
    private readonly fetcher: typeof fetch = fetch,
    private readonly pollDelayMs = 750,
    private readonly maxPolls = 40,
    private readonly localImageReader: (
      image: CapturedMedicineImage,
      signal?: AbortSignal,
    ) => Promise<Blob> = readLocalImage,
    private readonly timeouts: OcrTimeouts = DEFAULT_TIMEOUTS,
    private readonly stageReporter: (
      stage: OcrStage,
    ) => void = noStageReporting,
  ) {}

  async recognize(
    image: CapturedMedicineImage,
    signal?: AbortSignal,
  ): Promise<OcrCandidate> {
    throwIfAborted(signal);
    let body: Blob;
    try {
      body = await runBounded(
        (stageSignal) => this.localImageReader(image, stageSignal),
        this.timeouts.localReadMs,
        'local_file_read_timeout',
        signal,
      );
    } catch (error) {
      if (error instanceof OcrWorkflowError) throw error;
      throw new OcrWorkflowError('local_file_unavailable');
    }
    if (body.size < 1 || body.size > MAX_IMAGE_BYTES)
      throw new OcrWorkflowError('local_file_unavailable');
    this.stageReporter('capture_initiation_start');
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
                size_bytes: body.size,
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
      if (
        error instanceof OcrWorkflowError ||
        !(error instanceof ApiError) ||
        error.code !== 'REQUEST_TIMEOUT'
      )
        throw error;
      throw new OcrWorkflowError('capture_initiation_timeout');
    }
    this.stageReporter('capture_initiation_complete');
    try {
      this.stageReporter('upload_start');
      let uploaded: Response;
      try {
        uploaded = await runBounded(
          (stageSignal) =>
            this.fetcher(initiated.upload_url, {
              method: 'PUT',
              headers: initiated.required_headers,
              body,
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
      this.stageReporter('upload_complete');
      this.stageReporter('completion_start');
      let result: CaptureResult;
      try {
        result = await runBounded(
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
      this.stageReporter('completion_complete');
      this.stageReporter('polling_start');
      const candidate = await runBounded(
        (stageSignal) =>
          this.pollForCandidate(initiated.capture_id, result, stageSignal),
        this.timeouts.processingMs,
        'processing_timeout',
        signal,
      );
      this.stageReporter('polling_complete');
      return candidate;
    } catch (error) {
      await this.cancelCapture(initiated.capture_id);
      if (error instanceof OcrWorkflowError) throw error;
      throw error;
    }
  }

  private async pollForCandidate(
    captureId: string,
    initial: CaptureResult,
    signal: AbortSignal,
  ): Promise<OcrCandidate> {
    let result = initial;
    for (let count = 0; count <= this.maxPolls; count += 1) {
      throwIfAborted(signal);
      if (result.state === 'candidates_ready') return this.toCandidate(result);
      if (
        ['no_match', 'retake_required', 'failed_safe', 'expired'].includes(
          result.state,
        )
      )
        throw new IntegrationPendingError(result.failure_code ?? result.state);
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

  async decide(
    candidate: OcrCandidate,
    action: 'confirm' | 'none_of_these' | 'reject',
  ): Promise<void> {
    if (!candidate.captureId)
      throw new IntegrationPendingError(
        'Recognition capture reference is unavailable',
      );
    await this.api.request(
      `/api/v1/medicine-captures/${encodeURIComponent(candidate.captureId)}/decision`,
      {
        method: 'POST',
        body: JSON.stringify({
          action,
          candidate_id: action === 'confirm' ? candidate.candidateId : null,
          idempotency_key: `${candidate.captureId}:${action}`,
        }),
      },
      true,
    );
  }

  private toCandidate(result: CaptureResult): OcrCandidate {
    const [candidate, ...alternatives] = result.candidates;
    if (!candidate)
      throw new IntegrationPendingError('No medicine candidate is available');
    return {
      captureId: result.capture_id,
      candidateId: candidate.candidate_id,
      name: candidate.name,
      strength: candidate.strengths.join(' + '),
      dosageForm: candidate.dosage_form ?? '',
      confidence: candidate.confidence,
      alternatives: alternatives.map((item) => item.name),
      alternativeCandidates: alternatives.map((item) => ({
        candidateId: item.candidate_id,
        name: item.name,
        strength: item.strengths.join(' + '),
        dosageForm: item.dosage_form ?? '',
        confidence: item.confidence,
      })),
      sourceStatus: 'backend_candidate',
    };
  }

  private async cancelCapture(captureId: string): Promise<void> {
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
    } catch {
      // Best-effort cleanup must not replace the original safe upload failure.
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

export const isUneditedPresentedCandidate = (
  presented: OcrCandidate,
  selected: OcrCandidate,
): boolean => {
  const source =
    selected.candidateId === presented.candidateId
      ? presented
      : presented.alternativeCandidates?.find(
          (item) => item.candidateId === selected.candidateId,
        );
  return Boolean(
    source &&
    source.name === selected.name &&
    source.strength === selected.strength &&
    source.dosageForm === selected.dosageForm,
  );
};
