interface Props {
  /** `sm` : pastille seule (listes) ; `md` : pastille + libellé. */
  size?: 'sm' | 'md';
}

/** Badge « Profil vérifié » : e-mail confirmé + vérification d'identité Onfido réussie. */
export function VerifiedBadge({ size = 'md' }: Props) {
  const title = 'Profil vérifié : adresse e-mail confirmée et selfie vérifié';
  return (
    <span
      title={title}
      aria-label="Profil vérifié"
      className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 align-middle text-xs font-medium text-sky-800"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
        <path
          fillRule="evenodd"
          d="M10 1.5l2.2 1.6 2.7-.1.8 2.6 2.2 1.6-.9 2.6.9 2.6-2.2 1.6-.8 2.6-2.7-.1L10 18.5l-2.2-1.6-2.7.1-.8-2.6-2.2-1.6.9-2.6-.9-2.6 2.2-1.6.8-2.6 2.7.1L10 1.5zm3.7 6.2a.75.75 0 00-1.1-1l-3.4 3.8-1.5-1.5a.75.75 0 10-1.1 1.1l2.1 2a.75.75 0 001.1 0l3.9-4.4z"
          clipRule="evenodd"
        />
      </svg>
      {size === 'md' && 'Profil vérifié'}
    </span>
  );
}
