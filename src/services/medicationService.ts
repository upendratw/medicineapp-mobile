import { ApiClient } from '@/api/client';
import { IntegrationPendingError } from '@/services/integration';
import type {
  ManualMedicationInput,
  MedicationSummary,
  PatientMedication,
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
  create(input: ManualMedicationInput): Promise<PatientMedication>;
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
  async create(): Promise<PatientMedication> {
    throw new IntegrationPendingError('Patient medication creation');
  }
}

export class DevelopmentPatientMedicationService implements PatientMedicationService {
  readonly integrationPending = true;
  async list(): Promise<readonly MedicationSummary[]> {
    return [];
  }
  async create(_input: ManualMedicationInput): Promise<PatientMedication> {
    throw new IntegrationPendingError('Patient medication creation');
  }
}

type BackendPatientMedication = {
  id: string;
  name: string;
  strength: string | null;
  dosage_form: string | null;
  active_ingredient: string | null;
  manufacturer: string | null;
  notes: string | null;
  source: PatientMedication['source'];
  medicine_capture_id: string | null;
  is_active: boolean;
  inventory: {
    id: string;
    initial_quantity: string;
    remaining_quantity: string;
    quantity_unit: PatientMedication['inventory']['quantityUnit'];
    low_stock_threshold: string | null;
    revision: number;
  };
};

export class BackendPatientMedicationService implements PatientMedicationService {
  readonly integrationPending = false;
  constructor(private readonly client: ApiClient) {}
  async list(): Promise<readonly MedicationSummary[]> {
    return [];
  }
  async create(input: ManualMedicationInput): Promise<PatientMedication> {
    const row = await this.client.request<BackendPatientMedication>(
      '/api/v1/patient-medications',
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          strength: input.strength || null,
          dosage_form: input.dosageForm || null,
          active_ingredient: input.activeIngredient || null,
          manufacturer: input.manufacturer || null,
          notes: input.notes || null,
          source: input.source,
          medicine_capture_id: input.medicineCaptureId ?? null,
          inventory: {
            initial_quantity: input.initialQuantity,
            quantity_unit: input.quantityUnit,
          },
          idempotency_key: input.idempotencyKey,
        }),
      },
      true,
    );
    return {
      id: row.id,
      name: row.name,
      strength: row.strength,
      dosageForm: row.dosage_form,
      activeIngredient: row.active_ingredient,
      manufacturer: row.manufacturer,
      notes: row.notes,
      source: row.source,
      medicineCaptureId: row.medicine_capture_id,
      isActive: row.is_active,
      inventory: {
        id: row.inventory.id,
        initialQuantity: row.inventory.initial_quantity,
        remainingQuantity: row.inventory.remaining_quantity,
        quantityUnit: row.inventory.quantity_unit,
        lowStockThreshold: row.inventory.low_stock_threshold,
        revision: row.inventory.revision,
      },
    };
  }
}

export const buildPatientMedicationService = (
  client: ApiClient,
): PatientMedicationService => new BackendPatientMedicationService(client);
