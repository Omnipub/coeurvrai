import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-4 text-center">
      <h1 className="text-5xl font-bold text-coeur-600">coeur-vrai</h1>
      <p className="text-lg text-gray-700">
        Des rencontres sincères et respectueuses entre hommes et femmes trans.
      </p>
      <ul className="space-y-1 text-sm text-gray-600">
        <li>✓ Réservé aux personnes majeures</li>
        <li>✓ Photos visibles uniquement après un match, si vous le souhaitez</li>
        <li>✓ Signalement et blocage en un clic, modération humaine</li>
      </ul>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded-full bg-coeur-500 px-6 py-3 font-medium text-white hover:bg-coeur-600"
        >
          Créer un compte
        </Link>
        <Link href="/login" className="rounded-full border border-coeur-500 px-6 py-3 font-medium text-coeur-600">
          Se connecter
        </Link>
      </div>
    </main>
  );
}
