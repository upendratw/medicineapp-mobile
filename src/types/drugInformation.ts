export type DrugInformationSection = 'side_effects' | 'warnings';
export type DrugInformationLanguage = 'en-IN' | 'hi-IN' | 'kn-IN';

export type DrugCitation = Readonly<{
  evidenceId: string;
  source: string;
  sourceAuthority: string;
  sourceRecordId: string;
  sourceVersion: string;
  section: string;
  sourceReference: string;
  retrievedAt: string;
  sourceUpdatedAt: string | null;
}>;

export type DrugInformationResult = Readonly<{
  medication: { id: string; displayName: string };
  answerAvailable: boolean;
  status:
    | 'evidence_available'
    | 'human_translation_required'
    | 'insufficient_evidence'
    | 'insufficient_age_specific_evidence';
  statusText: string;
  answer: string | null;
  section: DrugInformationSection;
  freshness: 'current' | 'stale' | 'unknown' | null;
  citations: readonly DrugCitation[];
  safety: { evidenceBound: boolean; personalizedAdvice: false };
}>;
