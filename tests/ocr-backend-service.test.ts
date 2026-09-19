import { ApiError, type ApiClient } from '@/api/client';
import {
  BackendOcrService,
  isUneditedPresentedCandidate,
  readLocalImage,
} from '@/services/ocrService';
import type { CapturedMedicineImage, OcrCandidate } from '@/types/medication';

const mockFileState = {
  exists: true,
  size: 4,
  bytes: jest.fn(async () => new Uint8Array([0xff, 0xd8, 0xff, 0xd9])),
};

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => mockFileState),
}));

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

const fastTimeouts = {
  localReadMs: 20,
  initiationMs: 20,
  uploadMs: 20,
  completionMs: 20,
  processingMs: 20,
};

const never = <T>(): Promise<T> => new Promise<T>(() => undefined);

beforeEach(() => {
  mockFileState.exists = true;
  mockFileState.size = 4;
  mockFileState.bytes.mockReset();
  mockFileState.bytes.mockResolvedValue(
    new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
  );
});

const expectWorkflowFailure = async (
  promise: Promise<unknown>,
  code: string,
): Promise<void> => {
  await expect(promise).rejects.toMatchObject({
    name: 'OcrWorkflowError',
    code,
  });
};

test.each(['camera', 'gallery'] as const)(
  'valid %s image preparation yields an uploadable binary Blob',
  async (source) => {
    const prepared = await readLocalImage({ ...image, source });
    expect(prepared).toBeInstanceOf(Blob);
    expect(prepared.size).toBeGreaterThan(0);
    expect(prepared.type).toBe('image/jpeg');
  },
);

test.each([
  ['missing', false, 0],
  ['empty', true, 0],
  ['oversized', true, 5 * 1024 * 1024 + 1],
])(
  '%s local file fails before capture initiation',
  async (_case, exists, size) => {
    mockFileState.exists = exists as boolean;
    mockFileState.size = size as number;
    const request = jest.fn();
    const service = new BackendOcrService(
      { request } as unknown as ApiClient,
      fetch,
      0,
      1,
      readLocalImage,
      fastTimeouts,
    );
    await expectWorkflowFailure(
      service.recognize(image),
      'local_file_unavailable',
    );
    expect(request).not.toHaveBeenCalled();
  },
);

test('unsupported media type fails before capture initiation', async () => {
  const request = jest.fn();
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetch,
    0,
    1,
    readLocalImage,
    fastTimeouts,
  );
  await expectWorkflowFailure(
    service.recognize({ ...image, mediaType: 'image/gif' as 'image/jpeg' }),
    'local_file_unavailable',
  );
  expect(request).not.toHaveBeenCalled();
});

test('local read timeout terminates without backend initiation', async () => {
  const request = jest.fn();
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetch,
    0,
    1,
    () => never(),
    { ...fastTimeouts, localReadMs: 1 },
  );
  await expectWorkflowFailure(
    service.recognize(image),
    'local_file_read_timeout',
  );
  expect(request).not.toHaveBeenCalled();
});

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
  expect(
    request.mock.calls.filter(([path]) => path === '/api/v1/medicine-captures'),
  ).toHaveLength(1);
});

test('capture initiation timeout terminates before upload', async () => {
  const request = jest.fn(() => never());
  const fetcher = jest.fn();
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => new Blob(['image']),
    { ...fastTimeouts, initiationMs: 1 },
  );
  await expectWorkflowFailure(
    service.recognize(image),
    'capture_initiation_timeout',
  );
  expect(request).toHaveBeenCalledTimes(1);
  expect(fetcher).not.toHaveBeenCalled();
});

test('presigned PUT timeout aborts and requests best-effort cancellation', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockResolvedValueOnce({});
  const fetcher = jest.fn(() => never<Response>());
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => new Blob(['image']),
    { ...fastTimeouts, uploadMs: 1 },
  );
  await expectWorkflowFailure(service.recognize(image), 'upload_timeout');
  expect(request).toHaveBeenLastCalledWith(
    `/api/v1/medicine-captures/${initiated.capture_id}/cancel`,
    expect.objectContaining({
      method: 'POST',
      signal: expect.any(AbortSignal),
    }),
    true,
  );
});

test('completion timeout terminates and requests cancellation', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockImplementationOnce(() => never())
    .mockResolvedValueOnce({});
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch,
    0,
    1,
    async () => new Blob(['image']),
    { ...fastTimeouts, completionMs: 1 },
  );
  await expectWorkflowFailure(service.recognize(image), 'completion_timeout');
  expect(request).toHaveBeenLastCalledWith(
    `/api/v1/medicine-captures/${initiated.capture_id}/cancel`,
    expect.objectContaining({
      method: 'POST',
      signal: expect.any(AbortSignal),
    }),
    true,
  );
});

test('abort during local preparation terminates as cancelled', async () => {
  const request = jest.fn(() => never());
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetch,
    0,
    1,
    () => never<Blob>(),
    fastTimeouts,
  );
  const controller = new AbortController();
  const pending = service.recognize(image, controller.signal);
  await Promise.resolve();
  controller.abort();
  await expectWorkflowFailure(pending, 'cancelled');
  expect(request).not.toHaveBeenCalled();
});

test('abort during capture initiation terminates as cancelled', async () => {
  const request = jest.fn(() => never());
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetch,
    0,
    1,
    async () => new Blob(['image']),
    fastTimeouts,
  );
  const controller = new AbortController();
  const pending = service.recognize(image, controller.signal);
  while (request.mock.calls.length === 0) await Promise.resolve();
  controller.abort();
  await expectWorkflowFailure(pending, 'cancelled');
  expect(request).toHaveBeenCalledTimes(1);
});

test('abort during upload terminates and requests cancellation', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockResolvedValueOnce({});
  const fetcher = jest.fn(() => never<Response>());
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => new Blob(['image']),
    fastTimeouts,
  );
  const controller = new AbortController();
  const pending = service.recognize(image, controller.signal);
  while (fetcher.mock.calls.length === 0) await Promise.resolve();
  controller.abort();
  await expectWorkflowFailure(pending, 'cancelled');
  expect(request).toHaveBeenCalledWith(
    `/api/v1/medicine-captures/${initiated.capture_id}/cancel`,
    expect.objectContaining({
      method: 'POST',
      signal: expect.any(AbortSignal),
    }),
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
  await expectWorkflowFailure(service.recognize(image), 'upload_failed');
  expect(request).toHaveBeenCalledTimes(2);
  expect(request).toHaveBeenLastCalledWith(
    `/api/v1/medicine-captures/${initiated.capture_id}/cancel`,
    expect.objectContaining({
      method: 'POST',
      signal: expect.any(AbortSignal),
    }),
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
  while (request.mock.calls.length < 2) await Promise.resolve();
  controller.abort();
  await expectWorkflowFailure(pending, 'cancelled');
  expect(request).toHaveBeenCalledTimes(3);
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
  expect(request).toHaveBeenCalledTimes(3);
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
