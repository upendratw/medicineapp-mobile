export type ReviewStatus =
  'pending_review' | 'approved' | 'rejected' | 'user_entered_unreviewed';

export type MedicationSummary = Readonly<{
  id: string;
  canonicalName: string;
  dosageForm: string | null;
  strength: string | null;
  scheduleSummary: string | null;
  reviewStatus: ReviewStatus;
  isActive: boolean;
  source: 'backend_catalog' | 'user_entered';
}>;

export type InventoryQuantityUnit =
  'tablet' | 'capsule' | 'ml' | 'drop' | 'puff' | 'sachet' | 'patch' | 'unit';

export type PatientMedicationSource = 'manual' | 'ocr_assisted';

export type ManualMedicationInput = Readonly<{
  name: string;
  strength?: string;
  dosageForm?: string;
  activeIngredient?: string;
  manufacturer?: string;
  notes?: string;
  initialQuantity: string;
  quantityUnit: InventoryQuantityUnit;
  source: PatientMedicationSource;
  medicineCaptureId?: string;
  idempotencyKey: string;
}>;

export type PatientMedication = Readonly<{
  id: string;
  name: string;
  strength: string | null;
  dosageForm: string | null;
  activeIngredient: string | null;
  manufacturer: string | null;
  notes: string | null;
  source: PatientMedicationSource;
  medicineCaptureId: string | null;
  isActive: boolean;
  inventory: Readonly<{
    id: string;
    initialQuantity: string;
    remainingQuantity: string;
    quantityUnit: InventoryQuantityUnit;
    lowStockThreshold: string | null;
    revision: number;
  }>;
}>;

export type ReviewedMedicine = Readonly<{
  medicineName: string;
  strength: string;
  dosageForm: string;
  activeIngredient: string;
  manufacturer: string;
}>;

export type OcrCandidate = Readonly<{
  captureId?: string;
  candidateId?: string;
  name: string;
  strength: string;
  dosageForm: string;
  confidence?: number;
  alternatives: readonly string[];
  alternativeCandidates?: readonly Readonly<{
    candidateId: string;
    name: string;
    strength: string;
    dosageForm: string;
    confidence?: number;
  }>[];
  sourceStatus: 'development_fixture' | 'backend_candidate';
}>;

export type OcrTerminalOutcome = Readonly<{
  captureId: string;
  qualityReasons: readonly string[];
  failureCode: string | null;
}>;

export type OcrRecognitionResult =
  | Readonly<{
      kind: 'review_ready';
      captureId: string;
      extractedMedicine: ReviewedMedicine;
    }>
  | (Readonly<{ kind: 'no_match' }> & OcrTerminalOutcome)
  | (Readonly<{ kind: 'retake_required' }> & OcrTerminalOutcome)
  | (Readonly<{ kind: 'failed_safe' }> & OcrTerminalOutcome)
  | (Readonly<{ kind: 'expired' }> & OcrTerminalOutcome);

export type CapturedMedicineImage = Readonly<{
  uri: string;
  width: number;
  height: number;
  mediaType: 'image/jpeg' | 'image/png';
  source: 'camera' | 'gallery';
  idempotencyKey: string;
}>;
