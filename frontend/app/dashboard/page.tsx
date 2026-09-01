"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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


  useEffect(() => {
    const token =
      localStorage.getItem("claimflow_token");

    const storedUser =
      localStorage.getItem("claimflow_user");

    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(storedUser));

    async function loadDashboard() {
      try {
        const [
          policiesResponse,
          claimsResponse,
        ] = await Promise.all([
          apiRequest<PoliciesResponse>(
            "/api/policies",
            { token },
          ),

          apiRequest<ClaimsResponse>(
            "/api/claims",
            { token },
          ),
        ]);

        setPolicies(
          policiesResponse.policies,
        );

        setClaims(
          claimsResponse.claims,
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);


  function logout() {
    localStorage.removeItem(
      "claimflow_token",
    );

    localStorage.removeItem(
      "claimflow_user",
    );

    router.push("/login");
  }


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Loading ClaimFlow...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-gray-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">
              ClaimFlow
            </h1>

            <p className="text-sm text-gray-500">
              Insurance claims management
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm">
              {user?.first_name}{" "}
              {user?.last_name}
            </span>

            <button
              onClick={logout}
              className="rounded border px-4 py-2 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl p-6">
        <h2 className="mb-6 text-3xl font-bold">
          Dashboard
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-gray-500">
              Policies
            </p>

            <p className="mt-2 text-3xl font-bold">
              {policies.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-gray-500">
              Claims
            </p>

            <p className="mt-2 text-3xl font-bold">
              {claims.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-gray-500">
              Approved Claims
            </p>

            <p className="mt-2 text-3xl font-bold">
              {
                claims.filter(
                  (claim) =>
                    claim.status ===
                    "approved",
                ).length
              }
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-white p-6 shadow">
          <h3 className="mb-4 text-xl font-semibold">
            Recent Claims
          </h3>

          {claims.length === 0 ? (
            <p className="text-gray-500">
              No claims submitted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {claims.slice(0, 5).map(
                (claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between rounded border p-4"
                  >
                    <div>
                      <p className="font-medium">
                        {claim.claim_number}
                      </p>

                      <p className="text-sm text-gray-500">
                        {claim.description}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        KES{" "}
                        {claim.amount_claimed.toLocaleString()}
                      </p>

                      <p className="text-sm">
                        {claim.status}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}