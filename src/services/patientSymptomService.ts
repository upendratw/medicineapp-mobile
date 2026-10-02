import { ApiClient } from '@/api/client';

export type PatientSymptomEvent = Readonly<{
  id: string;
  sourceType: 'PATIENT_REPORTED';
  reportedAt: string;
}>;

type PatientSymptomEventResponse = {
  id: string;
  source_type: 'PATIENT_REPORTED';
  reported_at: string;
};

export interface PatientSymptomService {
  report(symptomText: string): Promise<PatientSymptomEvent>;
}

export class BackendPatientSymptomService implements PatientSymptomService {
  constructor(private readonly client: ApiClient) {}

  async report(symptomText: string): Promise<PatientSymptomEvent> {
    const data = await this.client.request<PatientSymptomEventResponse>(
      '/api/v1/patients/me/symptom-events',
      {
        method: 'POST',
        body: JSON.stringify({ symptom_text: symptomText }),
      },
      true,
    );
    return {
      id: data.id,
      sourceType: data.source_type,
      reportedAt: data.reported_at,
    };
  }
}
