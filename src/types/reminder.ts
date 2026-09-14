export type ReminderContext = Readonly<{
  reminderId: string;
  medicationId: string;
  medicationName: string;
  scheduledFor: string;
  statusText: string;
  instructions: string | null;
  scheduleRevision: number | null;
}>;

export type ReminderAction = 'TAKEN' | 'SKIPPED';
export type ReminderActionResult = Readonly<{
  result: 'APPLIED' | 'ALREADY_APPLIED' | 'SNOOZED';
}>;
