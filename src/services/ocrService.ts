import { publicEnvironment } from '@/config/environment';
import { IntegrationPendingError } from '@/services/integration';
import type { CapturedMedicineImage, OcrCandidate } from '@/types/medication';

export interface OcrService {
  recognize(image: CapturedMedicineImage): Promise<OcrCandidate>;
}
export class PendingOcrService implements OcrService {
  async recognize(): Promise<OcrCandidate> {
    throw new IntegrationPendingError('Medicine OCR');
  }
}
export class DevelopmentOcrService implements OcrService {
  async recognize(_image: CapturedMedicineImage): Promise<OcrCandidate> {
    return {
      name: 'Development scan candidate',
      strength: '',
      dosageForm: '',
      confidence: undefined,
      alternatives: [],
      sourceStatus: 'development_fixture',
    };
  }
}
export const buildOcrService = (): OcrService =>
  publicEnvironment.appEnvironment === 'development' &&
  publicEnvironment.developerDiagnostics
    ? new DevelopmentOcrService()
    : new PendingOcrService();
