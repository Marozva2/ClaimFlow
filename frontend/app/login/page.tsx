"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { useRef } from "react";

import { useAuth } from "@/lib/auth";

interface GoogleIdentityResponse {
  credential: string;
}

interface GoogleIdentityClient {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleIdentityResponse) => void;
      }) => void;
      renderButton: (
        target: HTMLElement,
        options: {
          theme: "outline";
          size: "large";
          text: "continue_with";
          shape: "rectangular";
          width: number;
        },
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityClient;
  }
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50" />}><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn, signInWithGoogle, ready, user } = useAuth();
  const googleButton = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  useEffect(() => {
    if (ready && user) router.replace(user.role === "customer" ? "/dashboard" : "/operations");
  }, [ready, router, user]);

  function initializeGoogle() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !googleButton.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        setGoogleError("");
        setLoading(true);
        try {
          const authenticatedUser = await signInWithGoogle(credential);
          router.replace(authenticatedUser.role === "customer" ? "/dashboard" : "/operations");
        } catch (cause) {
          setGoogleError(cause instanceof Error ? cause.message : "Google sign-in failed.");
        } finally {
          setLoading(false);
        }
      },
    });
    window.google.accounts.id.renderButton(googleButton.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 360,
    });
  }
  if (ready && user) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const authenticatedUser = await signIn(email.trim(), password);
      router.replace(
        authenticatedUser.role === "customer" ? "/dashboard" : "/operations",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <section className="hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-900">CF</span>
          <span className="text-lg font-semibold">ClaimFlow</span>
        </Link>
        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">Insurance operations</p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight">Every claim, clearly in motion.</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            A secure workspace for policies, claim progress, and insurance operations.
          </p>
        </div>
        <p className="text-sm text-slate-500">ClaimFlow · Insurance operations</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-600">Sign in to your ClaimFlow account.</p>
          {params.get("registered") === "1" && <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">Your account has been created. Sign in to continue.</p>}
          {params.get("logout") === "failed" && <p role="alert" className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Your browser session has been cleared, but the server could not confirm token revocation. Contact an administrator if you suspect your session remains active elsewhere.</p>}
          {error && <p role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
              <input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" />or continue with<span className="h-px flex-1 bg-slate-200" /></div>
              <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={initializeGoogle} />
              <div ref={googleButton} className="flex min-h-10 justify-center" />
              {googleError && <p role="alert" className="mt-3 text-sm text-rose-800">{googleError}</p>}
            </>
          )}
          <p className="mt-6 text-center text-sm text-slate-600">
            New to ClaimFlow? <Link href="/register" className="font-semibold text-slate-950 underline-offset-4 hover:underline">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
