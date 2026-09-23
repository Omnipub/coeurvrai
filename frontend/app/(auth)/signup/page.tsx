'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { AccountType } from '@/types';

/** Lien vers un document légal, ouvert dans un nouvel onglet pour ne pas perdre le formulaire. */
function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} target="_blank" rel="noopener" className="text-coeur-600 underline">
      {children}
    </Link>
  );
}

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await signup({
        email: String(form.get('email')),
        password: String(form.get('password')),
        displayName: String(form.get('displayName')),
        birthdate: String(form.get('birthdate')),
        accountType: form.get('accountType') as AccountType,
        acceptTerms: form.get('acceptTerms') === 'on',
        gdprConsent: form.get('gdprConsent') === 'on',
      });
      router.push('/onboarding/verify-email');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Inscription</h1>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Je suis</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="accountType" value="femme_trans" required /> une femme trans
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="accountType" value="homme" /> un homme
        </label>
      </fieldset>

      <input
        name="displayName"
        required
        minLength={2}
        maxLength={40}
        placeholder="Prénom ou pseudo"
        className="w-full rounded-lg border p-3"
      />
      <label className="block text-sm">
        Date de naissance
        <input name="birthdate" type="date" required className="mt-1 w-full rounded-lg border p-3" />
      </label>
      <input name="email" type="email" required placeholder="E-mail" className="w-full rounded-lg border p-3" />
      <input
        name="password"
        type="password"
        required
        minLength={10}
        placeholder="Mot de passe (10 caractères min.)"
        className="w-full rounded-lg border p-3"
      />

      <div className="space-y-3 rounded-lg bg-coeur-50 p-3 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="isAdult" required className="mt-1" />
          <span>Je certifie avoir 18 ans ou plus.</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="acceptTerms" required className="mt-1" />
          <span>
            J&apos;accepte les{' '}
            <LegalLink href="/legal/cgu">Conditions générales d&apos;utilisation</LegalLink> et la{' '}
            <LegalLink href="/legal/charte-communaute">Charte de la communauté</LegalLink>.
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="gdprConsent" required className="mt-1" />
          <span>
            J&apos;accepte que coeur-vrai traite les données révélant mon identité de genre et mon
            orientation sexuelle, dans le seul but de me proposer des profils compatibles (
            <LegalLink href="/legal/politique-confidentialite#sensibles">
              Politique de confidentialité
            </LegalLink>
            ). Je peux retirer ce consentement à tout moment.
          </span>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-full bg-coeur-500 py-3 font-medium text-white disabled:opacity-50"
      >
        Créer mon compte
      </button>
      <p className="text-center text-sm">
        Déjà inscrit·e ?{' '}
        <Link href="/login" className="text-coeur-600 underline">
          Connexion
        </Link>
      </p>
    </form>
  );
}
