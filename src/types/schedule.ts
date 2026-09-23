export type ScheduleRuleInput = Readonly<{
  rule_type: 'daily';
  times_of_day: readonly string[];
  days_of_week: readonly string[];
  interval_hours: null;
  interval_anchor: null;
  once_at: null;
}>;

export type ScheduleInput = Readonly<{
  medication_id?: string;
  patient_medication_id?: string;
  patient_user_id?: string;
  timezone: string;
  start_date: string;
  end_date?: string;
  food_instruction: 'none';
  dose_quantity?: string;
  dose_unit?: string;
  instructions_text?: string;
  medication_choice_confirmed: boolean;
  rules: readonly ScheduleRuleInput[];
  activate: boolean;
}>;

export type MedicationSchedule = Readonly<{
  id: string;
  medicationId: string;
  patientMedicationId?: string | null;
  status: 'draft' | 'active' | 'paused' | 'cancelled';
  timezone: string;
  startDate: string;
  endDate: string | null;
  times: readonly string[];
  revision: number;
}>;
