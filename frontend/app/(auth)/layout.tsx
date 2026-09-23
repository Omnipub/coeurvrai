import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <Link href="/" className="text-center text-3xl font-bold text-coeur-600">
        coeur-vrai
      </Link>
      <div className="rounded-2xl bg-white p-6 shadow-md">{children}</div>
    </main>
  );
}
