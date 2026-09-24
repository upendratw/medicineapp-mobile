import { mobileObservability, type MobileObservability } from '@/observability';

export type SafeDestination =
  | '/home'
  | '/medicines'
  | '/schedule'
  | '/medication-history'
  | '/medication-information'
  | '/accessibility-settings'
  | '/language-settings'
  | '/inventory'
  | '/interactions';
const destinations: Readonly<Record<string, SafeDestination>> = {
  home: '/home',
  medicines: '/medicines',
  schedule: '/schedule',
  history: '/medication-history',
  'drug-information': '/medication-information',
  accessibility: '/accessibility-settings',
  language: '/language-settings',
  inventory: '/inventory',
  interactions: '/interactions',
};
const prohibited =
  /token|jwt|refresh|otp|prescription|ocr|symptom|transcript|caregiver|side.?effect|emergency|sos|taken|skip|snooze|dose/i;
export type DeepLinkResolution = Readonly<{
  destination: SafeDestination;
  accepted: boolean;
  reason?: 'scheme' | 'payload' | 'route' | 'structure';
}>;
export type ReminderNotificationIntent = Readonly<{
  type: 'reminder';
  reminderId: string;
}>;
const reminderUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function resolveDeepLink(
  raw: string,
  observability: MobileObservability = mobileObservability,
): DeepLinkResolution {
  if (!raw || raw.length > 512 || prohibited.test(decodeSafely(raw)))
    return rejected('payload', observability);
  try {
    const url = new URL(raw);
    if (url.protocol !== 'medicineapp:')
      return rejected('scheme', observability);
    if (url.username || url.password || url.search || url.hash)
      return rejected('structure', observability);
    const segments = [url.hostname, ...url.pathname.split('/')]
      .filter(Boolean)
      .map((item) => decodeURIComponent(item));
    if (segments.length !== 1 || segments[0].length > 64)
      return rejected('structure', observability);
    const destination = destinations[segments[0]];
    return destination
      ? { destination, accepted: true }
      : rejected('route', observability);
  } catch {
    return rejected('structure', observability);
  }
}
export function resolveNotificationDestination(
  value: unknown,
  observability: MobileObservability = mobileObservability,
): DeepLinkResolution {
  if (typeof value !== 'string' || !/^\/[a-z-]{1,64}$/.test(value))
    return rejected('structure', observability);
  const entry = Object.entries(destinations).find(
    ([, destination]) => destination === value,
  );
  return entry
    ? { destination: entry[1], accepted: true }
    : rejected('route', observability);
}
export function parseNotificationIntent(
  value: unknown,
  observability: MobileObservability = mobileObservability,
): ReminderNotificationIntent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    rejected('structure', observability);
    return null;
  }
  const data = value as Record<string, unknown>;
  if (
    Object.keys(data).sort().join(',') !== 'reminder_id,schema_version,type' ||
    data.type !== 'medicineapp.reminder.due' ||
    data.schema_version !== 1 ||
    typeof data.reminder_id !== 'string' ||
    !reminderUuid.test(data.reminder_id)
  ) {
    rejected('payload', observability);
    return null;
  }
  return { type: 'reminder', reminderId: data.reminder_id };
}
function rejected(
  reason: NonNullable<DeepLinkResolution['reason']>,
  observability: MobileObservability,
): DeepLinkResolution {
  observability.event(
    'deep_link_rejected',
    'navigation',
    'rejected',
    reason.toUpperCase(),
  );
  observability.increment('deep_link_rejected', 'navigation', 'rejected');
  return { destination: '/home', accepted: false, reason };
}
function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
