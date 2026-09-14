import { fireEvent, render } from '@testing-library/react-native';
import { OcrConfirmationForm } from '@/components';
import type { OcrCandidate } from '@/types/medication';

const candidate: OcrCandidate = {
  name: 'Synthetic Candidate',
  strength: '10 mg',
  dosageForm: 'Tablet',
  confidence: 0.81,
  alternatives: ['Alternative candidate'],
  sourceStatus: 'backend_candidate',
};

test('OCR candidate requires explicit editable confirmation', async () => {
  const confirm = jest.fn();
  const reject = jest.fn();
  const retry = jest.fn();
  const manual = jest.fn();
  const screen = await render(
    <OcrConfirmationForm
      candidate={candidate}
      onConfirm={confirm}
      onReject={reject}
      onRetry={retry}
      onManual={manual}
    />,
  );
  expect(screen.getByText(/Recognition can be incorrect/)).toBeTruthy();
  expect(screen.getByText('Confidence: 81%')).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText('Recognized medicine name'),
    'Corrected Candidate',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'I verified this candidate' }),
  );
  expect(confirm).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Corrected Candidate' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Reject candidate' }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Retry scan' }));
  await fireEvent.press(
    screen.getByRole('button', { name: 'Enter manually instead' }),
  );
  expect(reject).toHaveBeenCalled();
  expect(retry).toHaveBeenCalled();
  expect(manual).toHaveBeenCalled();
});

test('missing OCR backend provides manual and retry fallbacks without auto-save', async () => {
  const manual = jest.fn();
  const retry = jest.fn();
  const screen = await render(
    <OcrConfirmationForm
      candidate={null}
      onConfirm={jest.fn()}
      onReject={jest.fn()}
      onRetry={retry}
      onManual={manual}
    />,
  );
  expect(
    screen.queryByRole('button', { name: 'I verified this candidate' }),
  ).toBeNull();
  expect(screen.getByText(/uploaded automatically/i)).toBeTruthy();
});
