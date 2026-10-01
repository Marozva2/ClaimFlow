"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import AppShell from "@/components/AppShell";
import { Card, EmptyState, ErrorNotice, formatDate, formatMoney, LoadingRows, PageHeader, StatusBadge } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Policy } from "@/types";

interface PoliciesResponse { policies: Policy[] }

export default function PoliciesPage() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiRequest<PoliciesResponse>("/api/v1/policies")
      .then((result) => setPolicies(result.policies))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load policies."))
      .finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => policies.filter((policy) =>
    `${policy.policy_number} ${policy.policy_type} ${policy.status}`.toLowerCase().includes(search.toLowerCase())
      && (!status || policy.status.toLowerCase() === status),
  ), [policies, search, status]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl p-5 sm:p-8">
        <PageHeader eyebrow="Coverage" title="Policies" description="Review your insurance cover and the claims connected to each policy." />
        {error && <ErrorNotice message={error} />}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <label className="flex max-w-md flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-slate-300">
            <Search aria-hidden="true" className="h-4 w-4 text-slate-500" />
            <span className="sr-only">Search policies</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by number, type, or status" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <label className="text-xs font-medium text-slate-600">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm sm:mt-0 sm:w-48"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="expired">Expired</option></select></label>
        </div>
        {loading ? <LoadingRows /> : !filtered.length ? (
          <EmptyState title={policies.length ? "No matching policies" : "No policies available"} description={policies.length ? "Try changing or clearing your search." : "Your policies will appear here when they are linked to your account."} />
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-slate-100 md:hidden">
              {filtered.map((policy) => <PolicyCard key={policy.id} policy={policy} />)}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Policy</th>{user?.role === "admin" && <th className="px-5 py-3">Customer</th>}<th className="px-5 py-3">Coverage</th><th className="px-5 py-3">Premium</th><th className="px-5 py-3">Effective dates</th><th className="px-5 py-3">Status</th><th className="px-5 py-3" /></tr></thead>
                <tbody className="divide-y divide-slate-100">{filtered.map((policy) => <tr key={policy.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/policies/${policy.id}`} className="font-semibold text-slate-900 hover:underline">{policy.policy_number}</Link><p className="mt-1 text-xs text-slate-500">{policy.policy_type}</p></td>{user?.role === "admin" && <td className="px-5 py-4 text-slate-700">User {policy.user_id}</td>}<td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums">{formatMoney(policy.coverage_amount)}</td><td className="whitespace-nowrap px-5 py-4 tabular-nums">{formatMoney(policy.premium)}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(policy.start_date)} – {formatDate(policy.end_date)}</td><td className="px-5 py-4"><StatusBadge status={policy.status} /></td><td className="px-5 py-4"><Link href={`/policies/${policy.id}`} className="font-semibold text-slate-700 hover:underline">Details</Link></td></tr>)}</tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function PolicyCard({ policy }: { policy: Policy }) {
  return (
    <Link href={`/policies/${policy.id}`} className="block p-5 hover:bg-slate-50">
      <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-950">{policy.policy_number}</span><StatusBadge status={policy.status} /></div>
      <p className="mt-1 text-sm text-slate-600">{policy.policy_type}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><span className="text-slate-500">Coverage <strong className="block text-slate-900">{formatMoney(policy.coverage_amount)}</strong></span><span className="text-slate-500">Premium <strong className="block text-slate-900">{formatMoney(policy.premium)}</strong></span></div>
      <p className="mt-3 text-xs text-slate-600">{formatDate(policy.start_date)} – {formatDate(policy.end_date)}</p>
    </Link>
  );
}
