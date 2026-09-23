export function formatDecimalQuantity(value: string): string {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return value;
  const fraction = match[2]?.replace(/0+$/, '') ?? '';
  return fraction ? `${match[1]}.${fraction}` : match[1];
}
