"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import AppShell from "@/components/AppShell";
import PaginationControls from "@/components/PaginationControls";
import { Card, EmptyState, ErrorNotice, LoadingRows, PageHeader } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { AuditLog, Pagination } from "@/types";

interface AuditResponse { events: AuditLog[]; pagination: Pagination }
const PAGE_SIZE = 25;

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), per_page: String(PAGE_SIZE) });
      if (search.trim()) params.set("q", search.trim());
      if (action) params.set("action", action);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      setLoading(true);
      setError("");
      apiRequest<AuditResponse>(`/api/v1/admin/audit?${params}`)
        .then((result) => { setEvents(result.events); setPagination(result.pagination); })
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load audit activity."))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [action, from, page, search, to]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl p-5 sm:p-8">
        <PageHeader eyebrow="Administration" title="Audit activity" description="Chronological system records for traceability. Event detail is read-only." />
        {error && <ErrorNotice message={error} />}
        <Card className="mb-5 p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5"><Search aria-hidden="true" className="h-4 w-4 text-slate-500" /><span className="sr-only">Search audit log</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search action or description" className="w-full text-sm outline-none" /></label>
            <label className="text-xs font-medium text-slate-600">Action<select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"><option value="">All actions</option><option value="claim_submitted">Claim submitted</option><option value="claim_assessed">Claim assessed</option><option value="claim_transition">Claim transition</option><option value="policy_created">Policy created</option><option value="policy_updated">Policy updated</option></select></label>
            <label className="text-xs font-medium text-slate-600">From<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" /></label>
            <label className="text-xs font-medium text-slate-600">Through<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" /></label>
          </div>
        </Card>
        {loading ? <LoadingRows /> : !events.length ? <EmptyState title="No audit events found" description="System events will appear here when claims and policies are acted on." /> : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-slate-100">{events.map((event) => <article key={event.id} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_13rem]"><div><p className="font-semibold capitalize text-slate-950">{event.action.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-slate-700">{event.description}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>{event.claim_id === null ? "System resource" : `Claim ${event.claim_id}`}</span><span>{event.user_id === null ? "System actor" : `Actor ${event.user_id}`}</span></div></div><time className="text-xs text-slate-600 sm:text-right">{new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</time></article>)}</div>
            <PaginationControls page={page} setPage={setPage} pagination={pagination} />
          </Card>
        )}
      </div>
    </AppShell>
  );
}
