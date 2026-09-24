export type ReminderContext = Readonly<{
  reminderId: string;
  medicationName: string;
  scheduledLocalTime: string;
  scheduledUtcTime: string;
  doseQuantity: string | null;
  doseUnit: string | null;
  status: string;
  statusText: string;
  instructions: string | null;
  scheduleRevision: number;
  allowedActions: readonly ('TAKEN' | 'SNOOZE' | 'SKIPPED')[];
}>;

export type ReminderAction = 'TAKEN' | 'SKIPPED';
export type ReminderActionResult = Readonly<{
  result: 'APPLIED' | 'ALREADY_APPLIED' | 'SNOOZED';
}>;
