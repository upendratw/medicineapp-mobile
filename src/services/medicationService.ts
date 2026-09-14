import { ApiClient } from '@/api/client';
import { publicEnvironment } from '@/config/environment';
import { IntegrationPendingError } from '@/services/integration';
import type {
  ManualMedicationInput,
  MedicationSummary,
} from '@/types/medication';

type BackendMedication = {
  id: string;
  canonical_name: string;
  dosage_form: string | null;
  ingredients?: {
    strength_value: number | null;
    strength_unit: string | null;
  }[];
  review_status: 'pending_review' | 'approved' | 'rejected';
  is_active: boolean;
};

export interface MedicationCatalogService {
  search(query: string): Promise<readonly MedicationSummary[]>;
}

export interface PatientMedicationService {
  list(signal?: AbortSignal): Promise<readonly MedicationSummary[]>;
  create(input: ManualMedicationInput): Promise<MedicationSummary>;
  readonly integrationPending: boolean;
}

const mapMedication = (item: BackendMedication): MedicationSummary => {
  const ingredient = item.ingredients?.[0];
  return {
    id: item.id,
    canonicalName: item.canonical_name,
    dosageForm: item.dosage_form,
    strength:
      ingredient?.strength_value != null
        ? `${ingredient.strength_value} ${ingredient.strength_unit ?? ''}`.trim()
        : null,
    scheduleSummary: null,
    reviewStatus: item.review_status,
    isActive: item.is_active,
    source: 'backend_catalog',
  };
};

export class BackendMedicationCatalogService implements MedicationCatalogService {
  constructor(private readonly client: ApiClient) {}
  async search(query: string): Promise<readonly MedicationSummary[]> {
    const value = query.trim();
    if (value.length < 2 || value.length > 100) return [];
    const rows = await this.client.request<BackendMedication[]>(
      `/api/v1/medications/search?q=${encodeURIComponent(value)}&limit=20`,
      {},
      true,
    );
    return rows.map(mapMedication);
  }
}

export class PendingPatientMedicationService implements PatientMedicationService {
  readonly integrationPending = true;
  async list(): Promise<readonly MedicationSummary[]> {
    return [];
  }
  async create(): Promise<MedicationSummary> {
    throw new IntegrationPendingError('Patient medication creation');
  }
}

export class DevelopmentPatientMedicationService implements PatientMedicationService {
  readonly integrationPending = true;
  private readonly items: MedicationSummary[] = [];
  async list(): Promise<readonly MedicationSummary[]> {
    return [...this.items];
  }
  async create(input: ManualMedicationInput): Promise<MedicationSummary> {
    const item: MedicationSummary = {
      id: `local-${this.items.length + 1}`,
      canonicalName: input.name,
      dosageForm: input.dosageForm ?? null,
      strength: input.strength ?? null,
      scheduleSummary: null,
      reviewStatus: 'user_entered_unreviewed',
      isActive: true,
      source: 'user_entered',
    };
    this.items.push(item);
    return item;
  }
}

export const buildPatientMedicationService = (): PatientMedicationService =>
  publicEnvironment.appEnvironment === 'development'
    ? new DevelopmentPatientMedicationService()
    : new PendingPatientMedicationService();
