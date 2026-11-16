export const MIN_AGE = 18;

/** Returns full years between birthDate (YYYY-MM-DD) and now, or null if invalid. */
export function ageFromBirthDate(birthDate: string | null | undefined): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  const dob = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dob.getTime()) || dob.getUTCFullYear() !== y) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - y;
  const beforeBirthday =
    now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d);
  if (beforeBirthday) age--;
  if (age < 0 || age > 120) return null;
  return age;
}

export function isAdult(birthDate: string | null | undefined) {
  const age = ageFromBirthDate(birthDate);
  return age !== null && age >= MIN_AGE;
}
