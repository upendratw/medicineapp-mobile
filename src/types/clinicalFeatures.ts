export type InteractionWarning = Readonly<{
  id: string;
  medicationIds: readonly string[];
  medicationPair: string;
  severity: string;
  summary: string;
  source: string;
  validatedStatus: string;
  updatedAt: string | null;
}>;

export type PrescriptionCandidate = Readonly<{
  id: string;
  medicationName: string;
  strength: string;
  dosageForm: string;
}>;

export type InventoryRecord = Readonly<{
  medicationId: string;
  medicationName: string;
  quantity: number | null;
  quantityUnit: string | null;
  refillStatus: string;
  refillReminderEnabled: boolean | null;
}>;
