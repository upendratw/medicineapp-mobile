import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockCancel = jest.fn();
const mockDecideOutcome = jest.fn();
const mockClear = jest.fn();
let mockResult: {
  kind: 'no_match' | 'retake_required' | 'failed_safe';
  captureId: string;
  qualityReasons: string[];
  failureCode: string | null;
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));
jest.mock('@/services/registry', () => ({
  ocrService: {
    cancel: (...args: unknown[]) => mockCancel(...args),
    decideOutcome: (...args: unknown[]) => mockDecideOutcome(...args),
  },
}));
jest.mock('@/state/CaptureContext', () => ({
  useCapture: () => ({
    candidate: null,
    recognitionResult: mockResult,
    clear: mockClear,
    setCandidate: jest.fn(),
  }),
}));

import OcrConfirmationScreen from '@/app/(app)/ocr-confirmation';
import { PreferencesProvider } from '@/state/PreferencesContext';

const captureId = '00000000-0000-4000-8000-000000000902';

beforeEach(() => {
  jest.clearAllMocks();
  mockCancel.mockResolvedValue(undefined);
  mockDecideOutcome.mockResolvedValue(undefined);
  mockResult = {
    kind: 'no_match',
    captureId,
    qualityReasons: [],
    failureCode: 'NO_SAFE_CANDIDATE',
  };
});

const view = () =>
  render(
    <PreferencesProvider>
      <OcrConfirmationScreen />
    </PreferencesProvider>,
  );

test('manual entry records none-of-these without cancellation or OCR prefill', async () => {
  const screen = await view();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Enter medicine manually' }),
  );
  await waitFor(() =>
    expect(mockDecideOutcome).toHaveBeenCalledWith(captureId, 'none_of_these'),
  );
  expect(mockCancel).not.toHaveBeenCalled();
  expect(mockClear).toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith('/add-medicine');
});

test('explicit Retake cancels the old capture before clearing it', async () => {
  const screen = await view();
  await fireEvent.press(screen.getByRole('button', { name: 'Retake photo' }));
  await waitFor(() => expect(mockCancel).toHaveBeenCalledWith(captureId));
  expect(mockClear).toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith('/medicine-camera');
});

test('Choose Another cancels the old capture and requests the gallery flow', async () => {
  const screen = await view();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Choose another photo' }),
  );
  await waitFor(() => expect(mockCancel).toHaveBeenCalledWith(captureId));
  expect(mockClear).toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith('/medicine-camera?choose=gallery');
});

test('failed-safe manual escape does not send an invalid backend decision', async () => {
  mockResult = {
    kind: 'failed_safe',
    captureId,
    qualityReasons: [],
    failureCode: 'RECOGNITION_PROCESSING_FAILED',
  };
  const screen = await view();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Enter medicine manually' }),
  );
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith('/add-medicine'),
  );
  expect(mockDecideOutcome).not.toHaveBeenCalled();
  expect(mockCancel).not.toHaveBeenCalled();
});
