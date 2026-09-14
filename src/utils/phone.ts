export function normalizeIndianPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const local =
    digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

export function isValidOtp(value: string): boolean {
  return /^\d{4,8}$/.test(value);
}
