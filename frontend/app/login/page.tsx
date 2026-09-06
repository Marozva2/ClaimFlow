"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { apiRequest } from "@/lib/api";
import { User } from "@/types";


interface LoginResponse {
  access_token: string;
  user: User;
}


export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data =
        await apiRequest<LoginResponse>(
          "/api/auth/login",
          {
            method: "POST",
            body: JSON.stringify({
              email,
              password,
            }),
          },
        );

      localStorage.setItem(
        "claimflow_token",
        data.access_token,
      );

      localStorage.setItem(
        "claimflow_user",
        JSON.stringify(data.user),
      );

      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-900">
              CF
            </div>

            <span className="text-lg font-semibold">
              ClaimFlow
            </span>
          </div>
        </div>

        <div className="max-w-lg">
          <p className="text-sm font-medium uppercase tracking-widest text-slate-400">
            Insurance claims management
          </p>

          <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight">
            Keep every claim moving.
          </h1>

          <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">
            Manage policies, submit claims, and
            follow every stage of the claims
            process from one place.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          ClaimFlow © 2026
        </p>
      </section>


      <section className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                CF
              </div>

              <span className="text-lg font-semibold text-slate-900">
                ClaimFlow
              </span>
            </div>
          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Welcome back
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Sign in to access your ClaimFlow
                account.
              </p>
            </div>


            {error && (
              <div
                role="alert"
                className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}


            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="you@example.com"
                />
              </div>


              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter your password"
                />
              </div>


              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Signing in..."
                  : "Sign in"}
              </button>
            </form>


            <p className="mt-6 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-slate-900 hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}