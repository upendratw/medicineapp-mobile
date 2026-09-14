import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(process.cwd(), 'src/app/(app)/medicine-camera.tsx'),
  'utf8',
);
test('camera handles permission, capture, preview, retake, and explicit continue', () => {
  expect(source).toContain('useCameraPermissions');
  expect(source).toContain('takePictureAsync');
  expect(source).toContain('Captured medicine packaging preview');
  expect(source).toContain('Retake photo');
  expect(source).toContain('Continue to recognition review');
});
test('camera does not upload automatically or log image paths', () => {
  expect(source).not.toMatch(/useEffect[^]*recognize/);
  expect(source).not.toContain('console.');
  expect(source).not.toContain('AsyncStorage');
  expect(source).toContain('image has not been uploaded');
});
