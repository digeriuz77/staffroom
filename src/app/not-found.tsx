import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-white">404</p>
      <p className="mt-4 text-slate-400">We couldn&apos;t find that page.</p>
      <Link href="/" className="mt-6 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15">
        Back to home
      </Link>
    </main>
  );
}
