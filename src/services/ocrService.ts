import { ApiError, type ApiClient } from '@/api/client';
import { File } from 'expo-file-system';
import { IntegrationPendingError } from '@/services/integration';
import type { CapturedMedicineImage, OcrCandidate } from '@/types/medication';

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
const readLocalImage = async (image: CapturedMedicineImage): Promise<Blob> => {
  const file = new File(image.uri);
  if (!file.exists)
    throw new IntegrationPendingError('Medicine image could not be read');
  return file;
};

export class BackendOcrService implements OcrService {
  constructor(
    private readonly api: ApiClient,
    private readonly fetcher: typeof fetch = fetch,
    private readonly pollDelayMs = 750,
    private readonly maxPolls = 40,
    private readonly localImageReader: (
      image: CapturedMedicineImage,
    ) => Promise<Blob> = readLocalImage,
  ) {}

  async recognize(
    image: CapturedMedicineImage,
    signal?: AbortSignal,
  ): Promise<OcrCandidate> {
    const body = await this.localImageReader(image);
    if (body.size < 1 || body.size > 5 * 1024 * 1024)
      throw new IntegrationPendingError('Medicine image size is unsupported');
    const initiated = await this.api.request<InitiatedCapture>(
      '/api/v1/medicine-captures',
      {
        method: 'POST',
        signal,
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
    );
    const uploaded = await this.fetcher(initiated.upload_url, {
      method: 'PUT',
      headers: initiated.required_headers,
      body,
      signal,
    });
    if (!uploaded.ok) {
      await this.cancelAfterFailedUpload(initiated.capture_id);
      throw new IntegrationPendingError('Medicine image upload failed');
    }
    let result = await this.requestResult(
      `/api/v1/medicine-captures/${encodeURIComponent(initiated.capture_id)}/complete`,
      { method: 'POST', signal },
      signal,
    );
    for (let count = 0; count <= this.maxPolls; count += 1) {
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
        `/api/v1/medicine-captures/${encodeURIComponent(initiated.capture_id)}`,
        { signal },
        signal,
      );
    }
    throw new IntegrationPendingError(
      'Medicine recognition is still processing',
    );
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

  private async cancelAfterFailedUpload(captureId: string): Promise<void> {
    try {
      await this.api.request(
        `/api/v1/medicine-captures/${encodeURIComponent(captureId)}/cancel`,
        { method: 'POST' },
        true,
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
