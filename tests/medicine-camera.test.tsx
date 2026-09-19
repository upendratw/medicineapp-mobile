import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockTakePictureAsync = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRecognize = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: React.forwardRef(
      (
        props: Record<string, unknown>,
        ref: { current: unknown } | ((value: unknown) => void),
      ) => {
        React.useImperativeHandle(ref, () => ({
          takePictureAsync: mockTakePictureAsync,
        }));
        return React.createElement(View, props);
      },
    ),
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
  randomUUID: () => '00000000-0000-4000-8000-000000000123',
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
}));

jest.mock('@/services/registry', () => ({
  ocrService: { recognize: (...args: unknown[]) => mockRecognize(...args) },
}));

import MedicineCameraScreen from '@/app/(app)/medicine-camera';
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
  mockRecognize.mockResolvedValue({
    captureId: '00000000-0000-4000-8000-000000000456',
    candidateId: '00000000-0000-4000-8000-000000000789',
    name: 'Synthetic candidate',
    strength: '',
    dosageForm: '',
    alternatives: [],
    sourceStatus: 'development_fixture',
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
