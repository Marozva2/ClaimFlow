import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="max-w-md rounded-xl border border-slate-200 bg-white p-7">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Not found</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">We couldn&apos;t find that record</h1>
        <p className="mt-2 text-sm text-slate-600">It may have been removed or you may not have access to it.</p>
        <Link href="/dashboard" className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Return to workspace</Link>
      </section>
    </main>
  );
}
