/** Normalize phone to digits only (Tajikistan-friendly: keeps last 9–12 digits). */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("992")) {
    return digits.slice(-9);
  }
  if (digits.length >= 11 && digits.startsWith("7")) {
    return digits.slice(-10);
  }
  return digits.length > 12 ? digits.slice(-12) : digits;
}

export function isValidPhone(raw: string): boolean {
  const n = normalizePhone(raw);
  return n.length >= 9 && n.length <= 12;
}

export function formatPhoneDisplay(raw: string): string {
  const n = normalizePhone(raw);
  if (n.length === 9) return `+992 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
  return raw.trim();
}

export function staffEmailFromPhone(phone: string): string {
  return `${normalizePhone(phone)}@staff.internal`;
}
