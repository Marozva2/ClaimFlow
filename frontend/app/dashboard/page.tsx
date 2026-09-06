"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppShell from "@/components/AppShell";
import { apiRequest } from "@/lib/api";
import { Claim, Policy, User } from "@/types";

interface PoliciesResponse {
  policies: Policy[];
}

interface ClaimsResponse {
  claims: Claim[];
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const token =
      localStorage.getItem("claimflow_token");

    const storedUser =
      localStorage.getItem("claimflow_user");

    // Authentication state is required to access the dashboard.
    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    // At this point TypeScript knows that token exists,
    // but making the invariant explicit also makes the
    // type expected by apiRequest clear.
    const authToken: string = token;

    let parsedUser: User;

    try {
      parsedUser = JSON.parse(
        storedUser,
      ) as User;
    } catch {
      // Corrupted local storage should not crash the application.
      localStorage.removeItem("claimflow_user");
      localStorage.removeItem("claimflow_token");

      router.replace("/login");
      return;
    }

    setUser(parsedUser);

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [
          policiesResponse,
          claimsResponse,
        ] = await Promise.all([
          apiRequest<PoliciesResponse>(
            "/api/policies",
            {
              token: authToken,
            },
          ),

          apiRequest<ClaimsResponse>(
            "/api/claims",
            {
              token: authToken,
            },
          ),
        ]);

        // Prevent state updates if the component
        // has already been unmounted.
        if (!mounted) {
          return;
        }

        setPolicies(
          policiesResponse.policies ?? [],
        );

        setClaims(
          claimsResponse.claims ?? [],
        );
      } catch (err) {
        if (!mounted) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Unable to load dashboard.";

        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    // Cleanup function runs when the component unmounts.
    return () => {
      mounted = false;
    };
  }, [router]);

  const activePolicies =
    policies.filter(
      (policy) =>
        policy.status.toLowerCase() ===
        "active",
    ).length;

  const pendingClaims =
    claims.filter(
      (claim) =>
        claim.status.toLowerCase() ===
          "pending" ||
        claim.status.toLowerCase() ===
          "submitted",
    ).length;

  const approvedClaims =
    claims.filter(
      (claim) =>
        claim.status.toLowerCase() ===
        "approved",
    ).length;

  if (loading) {
    return (
      <AppShell userName="Loading...">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 w-64 rounded bg-slate-200" />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-32 rounded-xl bg-white" />
              <div className="h-32 rounded-xl bg-white" />
              <div className="h-32 rounded-xl bg-white" />
            </div>

            <div className="h-80 rounded-xl bg-white" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      userName={
        user
          ? `${user.first_name} ${user.last_name}`
          : "Customer"
      }
    >
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        {/* Page heading */}
        <section className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            Overview
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
            Good day, {user?.first_name}.
          </h1>

          <p className="mt-2 text-slate-500">
            Here&apos;s an overview of your
            insurance activity.
          </p>
        </section>

        {/* API error */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-medium">
                We couldn&apos;t load your data.
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Summary statistics */}
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Active policies"
            value={activePolicies}
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          />

          <StatCard
            label="Pending claims"
            value={pendingClaims}
            icon={
              <Clock3 className="h-5 w-5" />
            }
          />

          <StatCard
            label="Approved claims"
            value={approvedClaims}
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          />
        </section>

        {/* Dashboard content */}
        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Recent claims */}
          <div className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Recent claims
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your latest claim activity
                </p>
              </div>

              <Link
                href="/claims"
                className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {claims.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <FileEmptyState />

                  <p className="mt-4 font-medium text-slate-900">
                    No claims yet
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Submitted claims will appear
                    here.
                  </p>
                </div>
              ) : (
                claims
                  .slice(0, 5)
                  .map((claim) => (
                    <ClaimRow
                      key={claim.id}
                      claim={claim}
                    />
                  ))
              )}
            </div>
          </div>

          {/* Policies */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="font-semibold text-slate-900">
                Your policies
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current coverage
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {policies.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  You have no policies yet.
                </div>
              ) : (
                policies
                  .slice(0, 4)
                  .map((policy) => (
                    <div
                      key={policy.id}
                      className="px-6 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {policy.policy_number}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {policy.policy_type}
                          </p>
                        </div>

                        <StatusBadge
                          status={policy.status}
                        />
                      </div>

                      <div className="mt-4 flex justify-between text-xs text-slate-500">
                        <span>Coverage</span>

                        <span className="font-medium text-slate-700">
                          KES{" "}
                          {policy.coverage_amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">
          {label}
        </span>

        <span className="text-slate-400">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function ClaimRow({
  claim,
}: {
  claim: Claim;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">
          {claim.claim_number}
        </p>

        <p className="mt-1 truncate text-sm text-slate-500">
          {claim.description}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-medium text-slate-900">
          KES{" "}
          {claim.amount_claimed.toLocaleString()}
        </p>

        <div className="mt-1">
          <StatusBadge
            status={claim.status}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  const classes =
    normalized === "approved" ||
    normalized === "active"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "rejected"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      {status}
    </span>
  );
}

function FileEmptyState() {
  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
      <FileTextIcon />
    </div>
  );
}

function FileTextIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5 text-slate-400"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 2v6h6M8 13h8M8 17h5"
      />
    </svg>
  );
}