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
export function resolveDeepLink(raw: string): DeepLinkResolution {
  if (!raw || raw.length > 512 || prohibited.test(decodeSafely(raw)))
    return { destination: '/home', accepted: false, reason: 'payload' };
  try {
    const url = new URL(raw);
    if (url.protocol !== 'medicineapp:')
      return { destination: '/home', accepted: false, reason: 'scheme' };
    if (url.username || url.password || url.search || url.hash)
      return { destination: '/home', accepted: false, reason: 'structure' };
    const segments = [url.hostname, ...url.pathname.split('/')]
      .filter(Boolean)
      .map((item) => decodeURIComponent(item));
    if (segments.length !== 1 || segments[0].length > 64)
      return { destination: '/home', accepted: false, reason: 'structure' };
    const destination = destinations[segments[0]];
    return destination
      ? { destination, accepted: true }
      : { destination: '/home', accepted: false, reason: 'route' };
  } catch {
    return { destination: '/home', accepted: false, reason: 'structure' };
  }
}
export function resolveNotificationDestination(
  value: unknown,
): DeepLinkResolution {
  if (typeof value !== 'string' || !/^\/[a-z-]{1,64}$/.test(value))
    return { destination: '/home', accepted: false, reason: 'structure' };
  const entry = Object.entries(destinations).find(
    ([, destination]) => destination === value,
  );
  return entry
    ? { destination: entry[1], accepted: true }
    : { destination: '/home', accepted: false, reason: 'route' };
}
function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
