import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { OcrOutcomePanel } from '@/components/OcrOutcomePanel';
import { PreferencesProvider } from '@/state/PreferencesContext';

const result = {
  kind: 'no_match' as const,
  captureId: '00000000-0000-4000-8000-000000000901',
  qualityReasons: ['IMAGE_TOO_BLURRY'],
  failureCode: 'NO_SAFE_CANDIDATE',
};

const view = (
  overrides: Partial<React.ComponentProps<typeof OcrOutcomePanel>> = {},
) => {
  const props = {
    result,
    working: false,
    onRetake: jest.fn(),
    onChooseAnother: jest.fn(),
    onManual: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
  return {
    props,
    element: (
      <PreferencesProvider>
        <OcrOutcomePanel {...props} />
      </PreferencesProvider>
    ),
  };
};

test('NO_MATCH is neutral, accessible, and offers only explicit safe actions', async () => {
  const { props, element } = view();
  const screen = await render(element);
  expect(screen.getByRole('alert')).toHaveTextContent(
    /couldn't confidently match this medicine to the verified medicine list/i,
  );
  expect(screen.getByText(/steadier focus and clearer lighting/i)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Retake photo' }));
  await fireEvent.press(
    screen.getByRole('button', { name: 'Choose another photo' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Enter medicine manually' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Cancel recognition' }),
  );
  expect(props.onRetake).toHaveBeenCalledTimes(1);
  expect(props.onChooseAnother).toHaveBeenCalledTimes(1);
  expect(props.onManual).toHaveBeenCalledTimes(1);
  expect(props.onCancel).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(screen.toJSON())).not.toContain('NO_SAFE_CANDIDATE');
});

test('NO_MATCH action copy is localized in Hindi', async () => {
  jest
    .mocked(AsyncStorage.getItem)
    .mockResolvedValueOnce(
      JSON.stringify({ language: 'hi-IN', accessibility: {} }),
    );
  const { element } = view();
  const screen = await render(element);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'दवा स्वयं दर्ज करें' }),
    ).toBeTruthy(),
  );
  expect(screen.getByText(/सत्यापित दवा सूची/)).toBeTruthy();
});

test('FAILED_SAFE remains bounded and never fabricates a candidate', async () => {
  const { element } = view({
    result: {
      kind: 'failed_safe',
      captureId: result.captureId,
      qualityReasons: [],
      failureCode: 'RECOGNITION_PROCESSING_FAILED',
    },
  });
  const screen = await render(element);
  expect(screen.getByRole('alert')).toHaveTextContent(
    /No medicine was created or confirmed/i,
  );
  expect(JSON.stringify(screen.toJSON())).not.toContain(
    'RECOGNITION_PROCESSING_FAILED',
  );
});
