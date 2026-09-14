import { fireEvent, render } from '@testing-library/react-native';
import { PrescriptionReview } from '@/components';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('candidate remains untrusted, editable, rejectable, and manually replaceable', async () => {
  const confirm = jest.fn();
  const reject = jest.fn();
  const manual = jest.fn();
  const screen = await render(
    <PrescriptionReview
      candidates={[
        {
          id: 'candidate-id',
          medicationName: 'Extracted name',
          strength: '5 mg',
          dosageForm: 'tablet',
        },
      ]}
      onConfirm={confirm}
      onReject={reject}
      onManual={manual}
    />,
  );
  expect(screen.getByText(/Review before saving/)).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText('Extracted medication name'),
    'Corrected name',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'I reviewed this candidate' }),
  );
  expect(confirm).toHaveBeenCalledWith(
    expect.objectContaining({ medicationName: 'Corrected name' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Reject extracted result' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Enter manually instead' }),
  );
  expect(reject).toHaveBeenCalled();
  expect(manual).toHaveBeenCalled();
});

test('camera requires explicit processing and never logs or persists prescription URI', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/app/(app)/prescription-scan.tsx'),
    'utf8',
  );
  expect(source).toContain('useCameraPermissions');
  expect(source).toContain('takePictureAsync');
  expect(source).toContain('Captured prescription preview');
  expect(source).toContain('Retake prescription');
  expect(source).toContain('Continue to prescription processing');
  expect(source).not.toMatch(/useEffect[^]*process/);
  expect(source).not.toContain('console.');
  expect(source).not.toContain('AsyncStorage');
  expect(source).not.toContain('s3');
});
