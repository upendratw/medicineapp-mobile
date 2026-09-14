import {
  PendingInteractionService,
  PendingInventoryService,
  PendingPrescriptionScanService,
} from '@/services/clinicalFeatureServices';

test('missing capabilities are explicit pending adapters without fabricated routes', async () => {
  await expect(new PendingInteractionService().list()).rejects.toMatchObject({
    feature: 'Validated interaction checking',
  });
  await expect(
    new PendingPrescriptionScanService().process({ uri: 'transient-test-uri' }),
  ).rejects.toMatchObject({ feature: 'Prescription OCR and upload' });
  await expect(new PendingInventoryService().get()).rejects.toMatchObject({
    feature: 'Medication inventory and refill',
  });
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      process.cwd(),
      'src/services/clinicalFeatureServices.ts',
    ),
    'utf8',
  );
  expect(source).not.toContain('/api/');
  expect(source).not.toMatch(/fetch\(|axios/);
});
