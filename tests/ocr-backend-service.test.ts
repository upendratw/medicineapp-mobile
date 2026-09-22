import { ApiError, type ApiClient } from '@/api/client';
import {
  BackendOcrService,
  type PreparedLocalImage,
  readLocalImage,
} from '@/services/ocrService';
import type { CapturedMedicineImage } from '@/types/medication';

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
  state: 'review_ready',
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
  extracted_medicine: {
    medicine_name: 'Synthetic medicine',
    strength: '10 mg',
    dosage_form: 'tablet',
    active_ingredient: null,
    manufacturer: null,
  },
};

const fastTimeouts = {
  localReadMs: 20,
  initiationMs: 20,
  uploadMs: 20,
  completionMs: 20,
  processingMs: 20,
};

const never = <T>(): Promise<T> => new Promise<T>(() => undefined);
const preparedImage = (): PreparedLocalImage => {
  const bytes = new TextEncoder().encode('synthetic-image');
  return { bytes, size: bytes.byteLength };
};

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
    expect(prepared.bytes).toBeInstanceOf(Uint8Array);
    expect(prepared.size).toBeGreaterThan(0);
    expect(prepared.bytes.byteLength).toBe(prepared.size);
  },
);

test.each([
  ['missing', false, 0, 'local_file_unavailable'],
  ['empty', true, 0, 'local_file_empty'],
  ['oversized', true, 5 * 1024 * 1024 + 1, 'local_file_too_large'],
])(
  '%s local file fails before capture initiation',
  async (_case, exists, size, expectedCode) => {
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
    await expectWorkflowFailure(service.recognize(image), expectedCode);
    expect(request).not.toHaveBeenCalled();
  },
);

test('native file read failure is sanitized before capture initiation', async () => {
  mockFileState.bytes.mockRejectedValueOnce(new Error('private native path'));
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
    'local_file_read_failed',
  );
  expect(request).not.toHaveBeenCalled();
});

test('native byte-count mismatch fails before capture initiation', async () => {
  mockFileState.bytes.mockResolvedValueOnce(new Uint8Array([0xff]));
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
    'local_file_read_failed',
  );
  expect(request).not.toHaveBeenCalled();
});

test('invalid binary-body result fails before capture initiation', async () => {
  const request = jest.fn();
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetch,
    0,
    1,
    async () => ({ bytes: {} as Uint8Array<ArrayBuffer>, size: 4 }),
    fastTimeouts,
  );
  await expectWorkflowFailure(
    service.recognize(image),
    'binary_body_creation_failed',
  );
  expect(request).not.toHaveBeenCalled();
});

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
    'local_file_metadata_invalid',
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

test('backend OCR uploads only after recognize and returns structured review fields', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockResolvedValueOnce(ready);
  const localImage = preparedImage();
  const fetcher = jest.fn().mockResolvedValueOnce({ ok: true });
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => localImage,
  );
  expect(fetcher).not.toHaveBeenCalled();
  const result = await service.recognize(image);
  expect(result).toEqual({
    kind: 'review_ready',
    captureId: initiated.capture_id,
    extractedMedicine: expect.objectContaining({
      medicineName: 'Synthetic medicine',
    }),
  });
  expect(fetcher).toHaveBeenCalledWith(
    initiated.upload_url,
    expect.objectContaining({
      method: 'PUT',
      headers: initiated.required_headers,
    }),
  );
  const uploadOptions = fetcher.mock.calls[0][1] as RequestInit;
  expect(uploadOptions.body).toBe(localImage.bytes);
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

test('successful physical-style preparation reports only bounded safe stages', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockResolvedValueOnce(ready);
  const stages: string[] = [];
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    jest.fn().mockResolvedValue({ ok: true }),
    0,
    1,
    readLocalImage,
    fastTimeouts,
    (stage) => stages.push(stage),
  );
  await service.recognize(image);
  expect(stages).toEqual([
    'local_file_check_started',
    'local_file_exists',
    'local_file_metadata_valid',
    'local_file_read_started',
    'local_file_read_completed',
    'binary_body_created',
    'capture_initiation_started',
    'capture_initiation_completed',
    'upload_started',
    'upload_completed',
    'completion_started',
    'completion_completed',
    'polling_started',
    'review_ready',
  ]);
  expect(stages.join(' ')).not.toContain(image.uri);
  expect(request).toHaveBeenCalledTimes(2);
});

test.each([
  ['no_match', 'NO_SAFE_CANDIDATE', 'outcome:no_match'],
  ['retake_required', 'IMAGE_RETAKE_REQUIRED', 'outcome:retake_required'],
  ['failed_safe', 'RECOGNITION_PROCESSING_FAILED', 'outcome:failed_safe'],
  ['expired', null, 'outcome:expired'],
] as const)(
  '%s is a first-class result and never triggers automatic cancellation',
  async (state, failureCode, outcomeStage) => {
    const request = jest
      .fn()
      .mockResolvedValueOnce(initiated)
      .mockResolvedValueOnce({
        ...ready,
        state,
        quality_reasons: ['IMAGE_TOO_BLURRY'],
        failure_code: failureCode,
        candidates: [],
      });
    const stages: string[] = [];
    const service = new BackendOcrService(
      { request } as unknown as ApiClient,
      jest.fn().mockResolvedValue({ ok: true }),
      0,
      1,
      async () => preparedImage(),
      fastTimeouts,
      (stage) => stages.push(stage),
    );
    await expect(service.recognize(image)).resolves.toEqual({
      kind: state,
      captureId: initiated.capture_id,
      qualityReasons: ['IMAGE_TOO_BLURRY'],
      failureCode,
    });
    expect(stages).toContain(outcomeStage);
    expect(
      request.mock.calls.some(([path]) => String(path).endsWith('/cancel')),
    ).toBe(false);
  },
);

test('explicit cancellation calls the backend only when requested', async () => {
  const request = jest.fn().mockResolvedValue({ state: 'cancelled' });
  const service = new BackendOcrService({ request } as unknown as ApiClient);
  await service.cancel(initiated.capture_id);
  expect(request).toHaveBeenCalledWith(
    `/api/v1/medicine-captures/${initiated.capture_id}/cancel`,
    expect.objectContaining({ method: 'POST' }),
    true,
  );
});

test.each([
  ['CAPTURE_IDEMPOTENCY_CONFLICT', 'capture_idempotency_conflict'],
  ['CAPTURE_ALREADY_ADVANCED', 'capture_already_advanced'],
] as const)(
  '409 %s preserves an accurate bounded classification',
  async (code, expected) => {
    const request = jest.fn().mockRejectedValue(new ApiError(code, 409));
    const service = new BackendOcrService(
      { request } as unknown as ApiClient,
      fetch,
      0,
      1,
      async () => preparedImage(),
      fastTimeouts,
    );
    await expectWorkflowFailure(service.recognize(image), expected);
  },
);

test('same-image retry preserves its key and does not create a second client identity', async () => {
  const request = jest
    .fn()
    .mockRejectedValueOnce(new ApiError('NETWORK_UNAVAILABLE', 0))
    .mockResolvedValueOnce(initiated)
    .mockResolvedValueOnce(ready);
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    jest.fn().mockResolvedValue({ ok: true }),
    0,
    1,
    async () => preparedImage(),
    fastTimeouts,
  );
  await expectWorkflowFailure(
    service.recognize(image),
    'capture_initiation_failed',
  );
  await expect(service.recognize(image)).resolves.toMatchObject({
    kind: 'review_ready',
  });
  const initiationBodies = request.mock.calls
    .filter(([path]) => path === '/api/v1/medicine-captures')
    .map(([, options]) => JSON.parse((options as RequestInit).body as string));
  expect(initiationBodies).toHaveLength(2);
  expect(new Set(initiationBodies.map((body) => body.idempotency_key))).toEqual(
    new Set([image.idempotencyKey]),
  );
});

test('initiation 403 remains an authorization error and does not clear or retry here', async () => {
  const request = jest.fn().mockRejectedValue(new ApiError('FORBIDDEN', 403));
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetch,
    0,
    1,
    async () => preparedImage(),
    fastTimeouts,
  );
  await expect(service.recognize(image)).rejects.toMatchObject({ status: 403 });
  expect(request).toHaveBeenCalledTimes(1);
});

test('capture initiation timeout terminates before upload', async () => {
  const request = jest.fn(() => never());
  const fetcher = jest.fn();
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => preparedImage(),
    { ...fastTimeouts, initiationMs: 1 },
  );
  await expectWorkflowFailure(
    service.recognize(image),
    'capture_initiation_timeout',
  );
  expect(request).toHaveBeenCalledTimes(1);
  expect(fetcher).not.toHaveBeenCalled();
});

test('capture initiation failure is sanitized and reports its bounded code', async () => {
  const request = jest.fn().mockRejectedValueOnce(new Error('private detail'));
  const fetcher = jest.fn();
  const stages: string[] = [];
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => preparedImage(),
    fastTimeouts,
    (stage) => stages.push(stage),
  );
  await expectWorkflowFailure(
    service.recognize(image),
    'capture_initiation_failed',
  );
  expect(stages).toEqual([
    'capture_initiation_started',
    'failed:capture_initiation_failed',
  ]);
  expect(fetcher).not.toHaveBeenCalled();
  expect(stages.join(' ')).not.toContain('private detail');
});

test('presigned PUT timeout fails safely without silently cancelling lifecycle state', async () => {
  const request = jest.fn().mockResolvedValueOnce(initiated);
  const fetcher = jest.fn(() => never<Response>());
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => preparedImage(),
    { ...fastTimeouts, uploadMs: 1 },
  );
  await expectWorkflowFailure(service.recognize(image), 'upload_timeout');
  expect(request).toHaveBeenCalledTimes(1);
});

test('completion timeout terminates without silently cancelling lifecycle state', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce(initiated)
    .mockImplementationOnce(() => never());
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch,
    0,
    1,
    async () => preparedImage(),
    { ...fastTimeouts, completionMs: 1 },
  );
  await expectWorkflowFailure(service.recognize(image), 'completion_timeout');
  expect(request).toHaveBeenCalledTimes(2);
});

test('abort during local preparation terminates as cancelled', async () => {
  const request = jest.fn(() => never());
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetch,
    0,
    1,
    () => never<PreparedLocalImage>(),
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
    async () => preparedImage(),
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
    async () => preparedImage(),
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

test('failed upload remains safe without cancellation or fake recognition success', async () => {
  const request = jest.fn().mockResolvedValueOnce(initiated);
  const fetcher = jest.fn().mockResolvedValueOnce({ ok: false });
  const service = new BackendOcrService(
    { request } as unknown as ApiClient,
    fetcher as unknown as typeof fetch,
    0,
    1,
    async () => preparedImage(),
  );
  await expectWorkflowFailure(service.recognize(image), 'upload_failed');
  expect(request).toHaveBeenCalledTimes(1);
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
    async () => preparedImage(),
  );
  await expect(service.recognize(image)).resolves.toMatchObject({
    kind: 'review_ready',
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
    async () => preparedImage(),
  );
  await expect(service.recognize(image)).resolves.toMatchObject({
    kind: 'review_ready',
    captureId: initiated.capture_id,
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
    async () => preparedImage(),
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
    async () => preparedImage(),
  );
  await expect(service.recognize(image)).rejects.toMatchObject({ status: 403 });
  expect(request).toHaveBeenCalledTimes(2);
  expect(
    request.mock.calls.some(([path]) => String(path).endsWith('/cancel')),
  ).toBe(false);
});

test('confirmation sends user-reviewed structured values', async () => {
  const request = jest.fn().mockResolvedValue({});
  const service = new BackendOcrService({ request } as unknown as ApiClient);
  await service.confirmReview(initiated.capture_id, {
    medicineName: 'User corrected text',
    strength: '10 mg',
    dosageForm: 'tablet',
    activeIngredient: '',
    manufacturer: '',
  });
  expect(request).toHaveBeenCalledWith(
    `/api/v1/medicine-captures/${initiated.capture_id}/decision`,
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"medicine_name":"User corrected text"'),
    }),
    true,
  );
});
