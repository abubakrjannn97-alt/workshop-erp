export function formatPhone(raw?: string | null) {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (!d) return raw;
  if (d.length === 12 && d.startsWith("992")) {
    return `+992 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  }
  if (d.length === 9) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  if (d.length === 11 && d.startsWith("9")) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
  }
  return raw;
}

export function orderNo(n: number | string) {
  return `№ ${n}`;
}
