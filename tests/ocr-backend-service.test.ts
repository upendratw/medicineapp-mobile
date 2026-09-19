import { ApiError, type ApiClient } from '@/api/client';
import {
  BackendOcrService,
  isUneditedPresentedCandidate,
} from '@/services/ocrService';
import type { CapturedMedicineImage, OcrCandidate } from '@/types/medication';

const image: CapturedMedicineImage = {
  uri: 'file:///synthetic/medicine.jpg',
  width: 800,
  height: 600,
  mediaType: 'image/jpeg',
  source: 'camera',
  idempotencyKey: '00000000-0000-4000-8000-000000000001',
};
const initiated = {
  capture_id: '00000000-0000-4000-8000-000000000002',
  state: 'upload_authorized',
  upload_url: 'https://upload.invalid/signed',
  required_headers: {
    'Content-Type': 'image/jpeg',
    'x-amz-server-side-encryption': 'AES256',
  },
};
const ready = {
  capture_id: initiated.capture_id,
  state: 'candidates_ready',
  quality_reasons: [],
  failure_code: null,
  candidates: [
    {
      candidate_id: '00000000-0000-4000-8000-000000000003',
      name: 'Synthetic catalog medicine',
      strengths: ['10 mg'],
      dosage_form: 'tablet',
      confidence: 0.87,
    },
  ],
};

test('backend OCR uploads only after recognize and returns a review candidate', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockResolvedValueOnce(ready);
  const localBlob = new Blob(['synthetic-image']);
  const fetcher = jest.fn().mockResolvedValueOnce({ ok: true });
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => localBlob,
  );
  expect(fetcher).not.toHaveBeenCalled();
  const candidate = await service.recognize(image);
  expect(candidate).toEqual(
    expect.objectContaining({
      captureId: initiated.capture_id,
      candidateId: ready.candidates[0].candidate_id,
      sourceStatus: 'backend_candidate',
    }),
  );
  expect(fetcher).toHaveBeenCalledWith(
    initiated.upload_url,
    expect.objectContaining({
      method: 'PUT',
      headers: initiated.required_headers,
    }),
  );
  const uploadOptions = fetcher.mock.calls[0][1] as RequestInit;
  expect(uploadOptions.body).toBe(localBlob);
  expect(uploadOptions.headers).toEqual(initiated.required_headers);
  expect(uploadOptions.body).not.toEqual(expect.any(String));
  expect(request).toHaveBeenNthCalledWith(
    1,
    '/api/v1/medicine-captures',
    expect.objectContaining({ method: 'POST' }),
    true,
  );
});

test('failed upload requests cleanup and never triggers fake recognition success', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockResolvedValueOnce({});
  const fetcher = jest.fn().mockResolvedValueOnce({ ok: false });
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => new Blob(['image']),
  );
  await expect(service.recognize(image)).rejects.toMatchObject({
    name: 'IntegrationPendingError',
  });
  expect(request).toHaveBeenCalledTimes(2);
  expect(request).toHaveBeenLastCalledWith(
    `/api/v1/medicine-captures/${initiated.capture_id}/cancel`,
    { method: 'POST' },
    true,
  );
});

test('bounded polling checks the final permitted response', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockResolvedValueOnce({ ...ready, state: 'processing', candidates: [] })
    .mockResolvedValueOnce(ready);
  const fetcher = jest.fn().mockResolvedValueOnce({ ok: true });
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => new Blob(['image']),
  );
  await expect(service.recognize(image)).resolves.toMatchObject({
    captureId: initiated.capture_id,
  });
  expect(request).toHaveBeenCalledTimes(3);
});

test('transient poll failure retries within the bounded policy', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockResolvedValueOnce({ ...ready, state: 'processing', candidates: [] })
    .mockRejectedValueOnce(new ApiError('NETWORK_UNAVAILABLE', 0))
    .mockResolvedValueOnce(ready);
  const fetcher = jest.fn().mockResolvedValueOnce({ ok: true });
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => new Blob(['image']),
  );
  await expect(service.recognize(image)).resolves.toMatchObject({
    candidateId: ready.candidates[0].candidate_id,
  });
  expect(request).toHaveBeenCalledTimes(4);
});

test('abort cancels bounded polling without fabricating a candidate', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockResolvedValueOnce({ ...ready, state: 'processing', candidates: [] });
  const fetcher = jest.fn().mockResolvedValueOnce({ ok: true });
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    10_000,
    40,
    async () => new Blob(['image']),
  );
  const controller = new AbortController();
  const pending = service.recognize(image, controller.signal);
  await Promise.resolve();
  await Promise.resolve();
  controller.abort();
  await expect(pending).rejects.toMatchObject({
    name: 'IntegrationPendingError',
  });
  expect(request).toHaveBeenCalledTimes(2);
});

test('authorization failures are not retried by OCR polling', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockRejectedValueOnce(new ApiError('FORBIDDEN', 403));
  const fetcher = jest.fn().mockResolvedValueOnce({ ok: true });
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    40,
    async () => new Blob(['image']),
  );
  await expect(service.recognize(image)).rejects.toMatchObject({ status: 403 });
  expect(request).toHaveBeenCalledTimes(2);
});

test('confirmation is backend-mediated with capture and candidate references', async () => {
  const request = jest.fn().mockResolvedValue({});
  const service = new BackendOcrService({ request } as unknown as ApiClient);
  const candidate: OcrCandidate = {
    captureId: initiated.capture_id,
    candidateId: ready.candidates[0].candidate_id,
    name: ready.candidates[0].name,
    strength: '10 mg',
    dosageForm: 'tablet',
    alternatives: [],
    sourceStatus: 'backend_candidate',
  };
  await service.decide(candidate, 'confirm');
  expect(request).toHaveBeenCalledWith(
    `/api/v1/medicine-captures/${initiated.capture_id}/decision`,
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"action":"confirm"'),
    }),
    true,
  );
});

test('edited text is not equivalent to an approved presented candidate', () => {
  const presented: OcrCandidate = {
    captureId: initiated.capture_id,
    candidateId: ready.candidates[0].candidate_id,
    name: ready.candidates[0].name,
    strength: '10 mg',
    dosageForm: 'tablet',
    alternatives: [],
    sourceStatus: 'backend_candidate',
  };
  expect(isUneditedPresentedCandidate(presented, presented)).toBe(true);
  expect(
    isUneditedPresentedCandidate(presented, {
      ...presented,
      name: 'User corrected text',
    }),
  ).toBe(false);
});
