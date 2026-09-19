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

export type ManualMedicationInput = Readonly<{
  name: string;
  strength?: string;
  dosageForm?: string;
  notes?: string;
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

export type CapturedMedicineImage = Readonly<{
  uri: string;
  width: number;
  height: number;
  mediaType: 'image/jpeg' | 'image/png';
  source: 'camera' | 'gallery';
  idempotencyKey: string;
}>;
