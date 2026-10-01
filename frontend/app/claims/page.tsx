"use client";

import { ChangeEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import AppShell from "@/components/AppShell";
import { Card, EmptyState, ErrorNotice, formatDate, formatMoney, LoadingRows, PageHeader, StatusBadge } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Claim, Pagination, Policy } from "@/types";

interface ClaimsResponse { claims: Claim[]; pagination: Pagination }
interface PoliciesResponse { policies: Policy[] }
const PAGE_SIZE = 10;

export default function ClaimsPage() {
  return <Suspense fallback={<div className="p-8"><LoadingRows /></div>}><ClaimsList /></Suspense>;
}

function ClaimsList() {
  const router = useRouter();
  const pathname = usePathname();
  const initialParams = useSearchParams();
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: PAGE_SIZE, total: 0, pages: 0 });
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [search, setSearch] = useState(() => initialParams.get("q") ?? "");
  const [status, setStatus] = useState(() => initialParams.get("status") ?? "");
  const [policyId, setPolicyId] = useState(() => initialParams.get("policy_id") ?? "");
  const [fromDate, setFromDate] = useState(() => initialParams.get("from") ?? "");
  const [toDate, setToDate] = useState(() => initialParams.get("to") ?? "");
  const [page, setPage] = useState(() => Number(initialParams.get("page")) > 0 ? Number(initialParams.get("page")) : 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(PAGE_SIZE),
    });
    for (const [key, value] of [
      ["q", debouncedSearch],
      ["status", status],
      ["policy_id", policyId],
      ["from", fromDate],
      ["to", toDate],
    ]) {
      if (value) params.set(key, value);
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      apiRequest<ClaimsResponse>(`/api/v1/claims?${params.toString()}`)
        .then((claimData) => {
          if (!active) return;
          setClaims(claimData.claims);
          setPagination(claimData.pagination);
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : "Unable to load claims.");
        })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [debouncedSearch, fromDate, page, policyId, status, toDate]);

  useEffect(() => {
    apiRequest<PoliciesResponse>("/api/v1/policies")
      .then((result) => setPolicies(result.policies))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load policies."));
  }, []);

  const policyMap = useMemo(() => new Map(policies.map((policy) => [policy.id, policy])), [policies]);

  function syncFilters(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    if (name === "q") setSearch(value);
    if (name === "status") setStatus(value);
    if (name === "policy_id") setPolicyId(value);
    if (name === "from") setFromDate(value);
    if (name === "to") setToDate(value);
    setPage(1);
    const params = new URLSearchParams(window.location.search);
    params.delete("page");
    if (value) params.set(name, value);
    else params.delete(name);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const pages = Math.max(1, pagination.pages);
  const visible = claims;
  const noFilters = !search && !status && !policyId && !fromDate && !toDate;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl p-5 sm:p-8">
        <PageHeader eyebrow="Claims" title="Claims" description="Search and review claim progress. Your visible records are scoped by your account and role." action={user?.role === "customer" ? <Link href="/claims/new" className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Submit a claim</Link> : undefined} />
        {error && <ErrorNotice message={error} />}
        <Card className="mb-5 p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 xl:col-span-2"><Search aria-hidden="true" className="h-4 w-4 text-slate-500" /><span className="sr-only">Search claims</span><input name="q" value={search} onChange={syncFilters} placeholder="Claim number, policy, or description" className="w-full text-sm outline-none" /></label>
            <label className="text-xs font-medium text-slate-600">Status<select name="status" value={status} onChange={syncFilters} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="">All statuses</option><option value="open">Open claims</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="awaiting_information">Requested information</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="settled">Settled</option><option value="closed">Closed</option></select></label>
            <label className="text-xs font-medium text-slate-600">Policy<select name="policy_id" value={policyId} onChange={syncFilters} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="">All policies</option>{policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.policy_number}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium text-slate-600">Submitted from<input aria-label="Submitted from" type="date" name="from" value={fromDate} onChange={syncFilters} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-xs text-slate-900" /></label>
              <label className="text-xs font-medium text-slate-600">Through<input aria-label="Submitted through" type="date" name="to" value={toDate} onChange={syncFilters} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-xs text-slate-900" /></label>
            </div>
          </div>
        </Card>
        {loading ? <LoadingRows /> : !visible.length ? (
          <EmptyState title={noFilters ? "No claims yet" : "No claims match these filters"} description={noFilters ? "Claims associated with your account will appear here when submitted." : "Change or clear one or more filters to see other claims."} />
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-slate-100 md:hidden">{visible.map((claim) => <ClaimCard key={claim.id} claim={claim} policy={policyMap.get(claim.policy_id)} search={search} status={status} policyId={policyId} fromDate={fromDate} toDate={toDate} page={page} />)}</div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Claim</th>{user?.role !== "customer" && <th className="px-5 py-3">Customer</th>}<th className="px-5 py-3">Policy</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Updated</th><th className="px-5 py-3">Status</th><th className="px-5 py-3" /></tr></thead>
                <tbody className="divide-y divide-slate-100">{visible.map((claim) => <tr key={claim.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={detailHref(claim.id, search, status, policyId, fromDate, toDate, page)} className="font-semibold text-slate-900 hover:underline">{claim.claim_number}</Link><p className="mt-1 max-w-xs truncate text-xs text-slate-500">{claim.description}</p></td>{user?.role !== "customer" && <td className="px-5 py-4"><p className="font-medium text-slate-900">{claim.customer?.first_name} {claim.customer?.last_name}</p><p className="text-xs text-slate-500">{claim.customer?.email}</p></td>}<td className="px-5 py-4 text-slate-700">{claim.policy?.policy_number ?? policyMap.get(claim.policy_id)?.policy_number ?? `Policy ${claim.policy_id}`}</td><td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums">{formatMoney(claim.amount_claimed)}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(claim.submitted_at)}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(claim.updated_at)}</td><td className="px-5 py-4"><StatusBadge status={claim.status} /></td><td className="px-5 py-4"><Link href={detailHref(claim.id, search, status, policyId, fromDate, toDate, page)} className="font-semibold text-slate-700 hover:underline">Open</Link></td></tr>)}</tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm"><p className="text-slate-600">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)} className="rounded border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40">Previous</button><button type="button" disabled={page >= pages} onClick={() => changePage(page + 1)} className="rounded border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40">Next</button></div></div>
          </Card>
        )}
      </div>
    </AppShell>
  );

  function changePage(nextPage: number) {
    setPage(nextPage);
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(nextPage));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }
}

function detailHref(id: number, search: string, status: string, policyId: string, from: string, to: string, page?: number) {
  const params = new URLSearchParams();
  for (const [key, value] of [["q", search], ["status", status], ["policy_id", policyId], ["from", from], ["to", to]]) if (value) params.set(key, value);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/claims/${id}${query ? `?returnTo=${encodeURIComponent(`/claims?${query}`)}` : ""}`;
}

function ClaimCard({ claim, policy, search, status, policyId, fromDate, toDate, page }: { claim: Claim; policy?: Policy; search: string; status: string; policyId: string; fromDate: string; toDate: string; page: number }) {
  return <Link href={detailHref(claim.id, search, status, policyId, fromDate, toDate, page)} className="block p-5 hover:bg-slate-50"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-950">{claim.claim_number}</span><StatusBadge status={claim.status} /></div><p className="mt-1 text-sm text-slate-600">{policy?.policy_number ?? `Policy ${claim.policy_id}`}</p><p className="mt-3 text-sm text-slate-700">{claim.description}</p><div className="mt-3 flex justify-between gap-2 text-xs text-slate-500"><span>{formatDate(claim.submitted_at)}</span><span className="font-semibold text-slate-900">{formatMoney(claim.amount_claimed)}</span></div></Link>;
}
