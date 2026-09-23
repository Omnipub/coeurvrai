/** Date de mise à jour visible, balisée avec <time>. */
export function UpdatedDate({ date, label = 'Mis à jour le' }: { date: string; label?: string }) {
  const formatted = new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
  return (
    <p className="text-sm text-gray-600">
      {label} <time dateTime={date}>{formatted}</time>
    </p>
  );
}
