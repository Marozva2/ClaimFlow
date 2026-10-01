"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ClaimFlow rendering error", error.digest ?? error.name);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="max-w-md rounded-xl border border-slate-200 bg-white p-7">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Unexpected error</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">This page could not be displayed</h1>
        <p className="mt-2 text-sm text-slate-600">Your data has not been changed by this display error. Try again or return to your workspace.</p>
        <button type="button" onClick={reset} className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Try again</button>
      </section>
    </main>
  );
}
