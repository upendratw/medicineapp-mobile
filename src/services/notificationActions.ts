export const REMINDER_NOTIFICATION_CATEGORY = 'MEDICINE_REMINDER_ACTIONS';
export const REMINDER_NOTIFICATION_SOUND = 'medicine-reminder-alarm.wav';

export const REMINDER_ACTION_IDENTIFIERS = {
  taken: 'MEDICINE_TAKEN',
  snooze: 'MEDICINE_SNOOZE',
  skipped: 'MEDICINE_SKIP',
} as const;

export type ReminderNotificationAction =
  keyof typeof REMINDER_ACTION_IDENTIFIERS;

export function resolveReminderNotificationAction(
  identifier: string,
): ReminderNotificationAction | null {
  const entry = Object.entries(REMINDER_ACTION_IDENTIFIERS).find(
    ([, value]) => value === identifier,
  );
  return (entry?.[0] as ReminderNotificationAction | undefined) ?? null;
}
