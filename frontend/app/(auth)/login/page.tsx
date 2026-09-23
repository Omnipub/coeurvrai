'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await login(String(form.get('email')), String(form.get('password')));
      router.push('/discover');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Connexion</h1>
      <input name="email" type="email" required placeholder="E-mail" className="w-full rounded-lg border p-3" />
      <input
        name="password"
        type="password"
        required
        placeholder="Mot de passe"
        className="w-full rounded-lg border p-3"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-full bg-coeur-500 py-3 font-medium text-white disabled:opacity-50"
      >
        Se connecter
      </button>
      <p className="text-center text-sm">
        Pas encore de compte ?{' '}
        <Link href="/signup" className="text-coeur-600 underline">
          Inscription
        </Link>
      </p>
    </form>
  );
}
