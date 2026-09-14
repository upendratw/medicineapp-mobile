import { IntegrationPendingError } from '@/services/integration';
import type {
  InteractionWarning,
  InventoryRecord,
  PrescriptionCandidate,
} from '@/types/clinicalFeatures';

export interface InteractionService {
  list(medicationId?: string): Promise<readonly InteractionWarning[]>;
}
export interface PrescriptionScanService {
  process(image: { uri: string }): Promise<readonly PrescriptionCandidate[]>;
}
export interface InventoryService {
  get(medicationId?: string): Promise<readonly InventoryRecord[]>;
  updateQuantity(
    medicationId: string,
    quantity: number,
  ): Promise<InventoryRecord>;
  setRefillReminder(
    medicationId: string,
    enabled: boolean,
  ): Promise<InventoryRecord>;
}

export class PendingInteractionService implements InteractionService {
  async list(_medicationId?: string): Promise<readonly InteractionWarning[]> {
    throw new IntegrationPendingError('Validated interaction checking');
  }
}
export class PendingPrescriptionScanService implements PrescriptionScanService {
  async process(_image: {
    uri: string;
  }): Promise<readonly PrescriptionCandidate[]> {
    throw new IntegrationPendingError('Prescription OCR and upload');
  }
}
export class PendingInventoryService implements InventoryService {
  async get(_medicationId?: string): Promise<readonly InventoryRecord[]> {
    throw new IntegrationPendingError('Medication inventory and refill');
  }
  async updateQuantity(
    _medicationId: string,
    _quantity: number,
  ): Promise<InventoryRecord> {
    throw new IntegrationPendingError('Medication inventory quantity update');
  }
  async setRefillReminder(
    _medicationId: string,
    _enabled: boolean,
  ): Promise<InventoryRecord> {
    throw new IntegrationPendingError('Medication refill reminders');
  }
}
