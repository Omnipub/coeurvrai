/** Âge en années révolues à partir d'une date ISO (YYYY-MM-DD). */
export function ageFromBirthdate(birthdate: string, now = new Date()): number {
  const birth = new Date(birthdate);
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}
