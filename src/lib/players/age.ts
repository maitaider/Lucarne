/**
 * Whole-years age from an ISO birth date (`YYYY-MM-DD`), computed as of "now".
 * Age is never stored (it would go stale) — always derived from `birth_date`.
 * Returns null when no/invalid date.
 */
export function computeAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const b = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - b.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < b.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 && age < 120 ? age : null;
}
