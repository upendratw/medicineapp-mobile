import { ApiClient } from '@/api/client';
import type {
  DrugCitation,
  DrugInformationLanguage,
  DrugInformationResult,
  DrugInformationSection,
} from '@/types/drugInformation';

type BackendCitation = {
  evidence_id: string;
  source: string;
  source_authority: string;
  source_record_id: string;
  source_version: string;
  section: string;
  source_reference: string;
  retrieved_at: string;
  source_updated_at: string | null;
};
type BackendResult = {
  medication: { id: string; display_name: string };
  answer_available: boolean;
  status: DrugInformationResult['status'];
  status_text: string;
  answer?: string;
  section: DrugInformationSection;
  freshness?: 'current' | 'stale' | 'unknown';
  citations: BackendCitation[];
  safety: { evidence_bound: boolean; personalized_advice: false };
};
const citation = (item: BackendCitation): DrugCitation => ({
  evidenceId: item.evidence_id,
  source: item.source,
  sourceAuthority: item.source_authority,
  sourceRecordId: item.source_record_id,
  sourceVersion: item.source_version,
  section: item.section,
  sourceReference: item.source_reference,
  retrievedAt: item.retrieved_at,
  sourceUpdatedAt: item.source_updated_at,
});

export class DrugInformationService {
  constructor(private readonly client: ApiClient) {}
  async query(
    medicationName: string,
    section: DrugInformationSection,
    language: DrugInformationLanguage = 'en-IN',
  ): Promise<DrugInformationResult> {
    const data = await this.client.request<BackendResult>(
      '/api/v1/drug-information/query',
      {
        method: 'POST',
        body: JSON.stringify({
          query: medicationName.trim().slice(0, 200),
          section,
          language,
          age_context: 'none',
        }),
      },
      true,
    );
    return {
      medication: {
        id: data.medication.id,
        displayName: data.medication.display_name,
      },
      answerAvailable: data.answer_available,
      status: data.status,
      statusText: data.status_text,
      answer: data.answer ?? null,
      section: data.section,
      freshness: data.freshness ?? null,
      citations: data.citations.map(citation),
      safety: {
        evidenceBound: data.safety.evidence_bound,
        personalizedAdvice: data.safety.personalized_advice,
      },
    };
  }
}
