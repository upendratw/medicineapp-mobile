import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockTakePictureAsync = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRecognize = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockRandomUUID = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const CameraView = React.forwardRef(
    (
      props: Record<string, unknown>,
      ref: { current: unknown } | ((value: unknown) => void),
    ) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: mockTakePictureAsync,
      }));
      return React.createElement(View, props);
    },
  );
  CameraView.displayName = 'MockCameraView';
  return {
    CameraView,
    useCameraPermissions: () => [
      { granted: true, canAskAgain: true },
      jest.fn(),
    ],
  };
});

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => React.createElement(View, props),
  };
});

jest.mock('expo-crypto', () => ({
  randomUUID: () => mockRandomUUID(),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
}));

jest.mock('@/services/registry', () => ({
  ocrService: { recognize: (...args: unknown[]) => mockRecognize(...args) },
}));

import MedicineCameraScreen, {
  recognitionFailureMessage,
} from '@/app/(app)/medicine-camera';
import { OcrWorkflowError } from '@/services/ocrService';
import { CaptureProvider } from '@/state/CaptureContext';
import { PreferencesProvider } from '@/state/PreferencesContext';
import { SingleFlight } from '@/utils/singleFlight';

const view = () => (
  <PreferencesProvider>
    <CaptureProvider>
      <MedicineCameraScreen />
    </CaptureProvider>
  </PreferencesProvider>
);

const readyCamera = async (
  screen: Awaited<ReturnType<typeof render>>,
): Promise<void> => {
  await fireEvent(screen.getByTestId('medicine-camera-preview'), 'cameraReady');
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRandomUUID.mockReturnValue('00000000-0000-4000-8000-000000000123');
  mockRecognize.mockReset();
  mockRecognize.mockResolvedValue({
    kind: 'candidates_ready',
    candidate: {
      captureId: '00000000-0000-4000-8000-000000000456',
      candidateId: '00000000-0000-4000-8000-000000000789',
      name: 'Synthetic candidate',
      strength: '',
      dosageForm: '',
      alternatives: [],
      sourceStatus: 'development_fixture',
    },
  });
});

test('renders a safe accessible capture control after camera readiness', async () => {
  const screen = await render(view());
  const control = screen.getByRole('button', { name: 'Take photo' });
  expect(control.props.accessibilityHint).toMatch(/not uploaded automatically/);
  expect(control.props.accessibilityState.disabled).toBe(true);
  await readyCamera(screen);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Take photo' }).props
        .accessibilityState.disabled,
    ).toBe(false),
  );
});

test('capture displays only a transient preview', async () => {
  mockTakePictureAsync.mockResolvedValue({
    uri: 'file:///temporary/synthetic-image.jpg',
    width: 800,
    height: 600,
  });
  const screen = await render(view());
  await readyCamera(screen);
  const control = screen.getByRole('button', { name: 'Take photo' });
  await fireEvent.press(control);
  expect(mockTakePictureAsync).toHaveBeenCalledTimes(1);
  expect(mockRecognize).not.toHaveBeenCalled();
  await screen.findByLabelText('Captured medicine packaging preview');
});

test('capture single-flight gate blocks duplicate native operations', async () => {
  const gate = new SingleFlight();
  let complete!: () => void;
  const operation = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  const first = gate.run(operation);
  await expect(gate.run(operation)).resolves.toBeUndefined();
  expect(operation).toHaveBeenCalledTimes(1);
  complete();
  await first;
  const next = jest.fn().mockResolvedValue('captured');
  await expect(gate.run(next)).resolves.toBe('captured');
});

test('capture failure is sanitized and remains retryable', async () => {
  mockTakePictureAsync.mockRejectedValue(
    new Error('private camera implementation detail'),
  );
  const screen = await render(view());
  await readyCamera(screen);
  await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
  await waitFor(() =>
    expect(screen.getByText(/image could not be captured/i)).toBeTruthy(),
  );
  expect(JSON.stringify(screen.toJSON())).not.toContain(
    'private camera implementation detail',
  );
  expect(screen.getByRole('button', { name: 'Take photo' })).toBeTruthy();
});

test('retake returns to camera and Continue explicitly enters OCR review', async () => {
  mockTakePictureAsync.mockResolvedValue({
    uri: 'file:///temporary/synthetic-image.jpg',
    width: 800,
    height: 600,
  });
  const screen = await render(view());
  await readyCamera(screen);
  await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
  await screen.findByLabelText('Captured medicine packaging preview');
  await fireEvent.press(screen.getByRole('button', { name: 'Retake photo' }));
  await screen.findByTestId('medicine-camera-preview');
  await readyCamera(screen);
  await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
  await screen.findByLabelText('Captured medicine packaging preview');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue to recognition review' }),
  );
  await waitFor(() => expect(mockRecognize).toHaveBeenCalledTimes(1));
  expect(mockPush).toHaveBeenCalledWith('/ocr-confirmation');
});

test('gallery selection remains local until explicit Continue', async () => {
  mockLaunchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///temporary/gallery-image.png',
        width: 640,
        height: 480,
        mimeType: 'image/png',
      },
    ],
  });
  const screen = await render(view());
  await readyCamera(screen);
  await fireEvent.press(
    screen.getByRole('button', { name: 'Choose from photo library' }),
  );
  await screen.findByLabelText('Captured medicine packaging preview');
  expect(mockRecognize).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue to recognition review' }),
  );
  await waitFor(() =>
    expect(mockRecognize).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'gallery', mediaType: 'image/png' }),
      expect.any(AbortSignal),
    ),
  );
});

test('Retake and a replacement photo receive a new idempotency key', async () => {
  mockRandomUUID
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000123')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000124');
  mockTakePictureAsync.mockResolvedValue({
    uri: 'file:///temporary/synthetic-image.jpg',
    width: 800,
    height: 600,
  });
  const screen = await render(view());
  await readyCamera(screen);
  await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Retake photo' }));
  await readyCamera(screen);
  await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue to recognition review' }),
  );
  await waitFor(() => expect(mockRecognize).toHaveBeenCalledTimes(1));
  expect(mockRecognize.mock.calls[0][0].idempotencyKey).toBe(
    '00000000-0000-4000-8000-000000000124',
  );
});

test('gallery replacement receives a new idempotency key', async () => {
  mockRandomUUID
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000123')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000125');
  mockTakePictureAsync.mockResolvedValue({
    uri: 'file:///temporary/synthetic-image.jpg',
    width: 800,
    height: 600,
  });
  mockLaunchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///temporary/replacement.png',
        width: 640,
        height: 480,
        mimeType: 'image/png',
      },
    ],
  });
  const screen = await render(view());
  await readyCamera(screen);
  await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
  await fireEvent.press(
    screen.getByRole('button', { name: 'Choose another photo' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue to recognition review' }),
  );
  await waitFor(() => expect(mockRecognize).toHaveBeenCalledTimes(1));
  expect(mockRecognize.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      source: 'gallery',
      idempotencyKey: '00000000-0000-4000-8000-000000000125',
    }),
  );
});

test('double Continue starts exactly one recognition operation', async () => {
  mockTakePictureAsync.mockResolvedValue({
    uri: 'file:///temporary/synthetic-image.jpg',
    width: 800,
    height: 600,
  });
  let resolveRecognition!: (value: unknown) => void;
  mockRecognize.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRecognition = resolve;
      }),
  );
  const screen = await render(view());
  await readyCamera(screen);
  await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
  const continueButton = await screen.findByRole('button', {
    name: 'Continue to recognition review',
  });
  fireEvent.press(continueButton);
  await waitFor(() => expect(mockRecognize).toHaveBeenCalledTimes(1));
  fireEvent.press(continueButton);
  expect(mockRecognize).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolveRecognition({
      kind: 'candidates_ready',
      candidate: {
        captureId: '00000000-0000-4000-8000-000000000456',
        candidateId: '00000000-0000-4000-8000-000000000789',
        name: 'Synthetic candidate',
        strength: '',
        dosageForm: '',
        alternatives: [],
        sourceStatus: 'backend_candidate',
      },
    });
    await Promise.resolve();
  });
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  await screen.unmount();
});

test('recognition failure clears working state and remains retryable', async () => {
  mockTakePictureAsync.mockResolvedValue({
    uri: 'file:///temporary/synthetic-image.jpg',
    width: 800,
    height: 600,
  });
  mockRecognize.mockRejectedValueOnce(new Error('private failure detail'));
  const screen = await render(view());
  await readyCamera(screen);
  await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
  await fireEvent.press(
    await screen.findByRole('button', {
      name: 'Continue to recognition review',
    }),
  );
  await waitFor(() =>
    expect(JSON.stringify(screen.toJSON())).toContain(
      'Recognition is temporarily unavailable.',
    ),
  );
  expect(
    screen.getByRole('button', { name: 'Continue to recognition review' }).props
      .accessibilityState.disabled,
  ).toBe(false);
  expect(JSON.stringify(screen.toJSON())).not.toContain(
    'private failure detail',
  );
});

test('Retake aborts pending recognition and clears the transient image', async () => {
  mockTakePictureAsync.mockResolvedValue({
    uri: 'file:///temporary/synthetic-image.jpg',
    width: 800,
    height: 600,
  });
  let recognitionSignal: AbortSignal | undefined;
  mockRecognize.mockImplementationOnce(
    (_image, signal: AbortSignal) =>
      new Promise((_resolve, reject) => {
        recognitionSignal = signal;
        signal.addEventListener('abort', () => reject(new Error('cancelled')), {
          once: true,
        });
      }),
  );
  const screen = await render(view());
  await readyCamera(screen);
  await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
  fireEvent.press(
    await screen.findByRole('button', {
      name: 'Continue to recognition review',
    }),
  );
  await waitFor(() => expect(mockRecognize).toHaveBeenCalledTimes(1));
  await fireEvent.press(screen.getByRole('button', { name: 'Retake photo' }));
  expect(recognitionSignal?.aborted).toBe(true);
  await screen.findByTestId('medicine-camera-preview');
  expect(mockPush).not.toHaveBeenCalled();
});

test('actual screen unmount aborts pending recognition', async () => {
  mockTakePictureAsync.mockResolvedValue({
    uri: 'file:///temporary/synthetic-image.jpg',
    width: 800,
    height: 600,
  });
  let recognitionSignal: AbortSignal | undefined;
  mockRecognize.mockImplementationOnce(
    (_image, signal: AbortSignal) =>
      new Promise((_resolve, reject) => {
        recognitionSignal = signal;
        signal.addEventListener('abort', () => reject(new Error('cancelled')), {
          once: true,
        });
      }),
  );
  const screen = await render(view());
  await readyCamera(screen);
  await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
  fireEvent.press(
    await screen.findByRole('button', {
      name: 'Continue to recognition review',
    }),
  );
  await waitFor(() => expect(mockRecognize).toHaveBeenCalledTimes(1));
  await screen.unmount();
  expect(recognitionSignal?.aborted).toBe(true);
});

test('diagnostic error copy exposes only a bounded code in Development', () => {
  const failure = new OcrWorkflowError('local_file_read_failed');
  expect(recognitionFailureMessage(failure, true)).toBe(
    'Recognition unavailable [local_file_read_failed]',
  );
  expect(recognitionFailureMessage(failure, false)).toBe(
    'Recognition could not produce a safe candidate. Retake the image or enter the medicine manually.',
  );
});
