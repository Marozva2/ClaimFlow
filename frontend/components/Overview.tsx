"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CircleAlert, FileCheck2, FileClock } from "lucide-react";

import AppShell from "@/components/AppShell";
import { Card, EmptyState, ErrorNotice, formatDate, formatMoney, LoadingRows, PageHeader, PrimaryLink, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { Claim, Policy } from "@/types";

interface ClaimListResponse { claims: Claim[]; pagination: { total: number } }
interface PolicyListResponse { policies: Policy[] }

export default function Overview() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [counts, setCounts] = useState({ open: 0, attention: 0, submitted: 0, review: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const staff = user?.role !== "customer";

  useEffect(() => {
    let current = true;
    const countClaims = (status: string) =>
      apiRequest<ClaimListResponse>(
        `/api/v1/claims?${new URLSearchParams({
          status,
          page: "1",
          per_page: "1",
        })}`,
      );
    const loadStaff = async () => {
      const [recent, submitted, information, review] = await Promise.all([
          apiRequest<ClaimListResponse>("/api/v1/claims?page=1&per_page=6"),
          countClaims("submitted"),
          countClaims("awaiting_information"),
          countClaims("under_review"),
        ]);
      if (!current) return;
      setClaims(recent.claims);
      setCounts({
        open:
          submitted.pagination.total +
          information.pagination.total +
          review.pagination.total,
        attention: information.pagination.total,
        submitted: submitted.pagination.total,
        review: review.pagination.total,
      });
    };
    const loadCustomer = async () => {
      const [recent, policyData, open, information, submitted] = await Promise.all([
          apiRequest<ClaimListResponse>("/api/v1/claims?page=1&per_page=5"),
          apiRequest<PolicyListResponse>("/api/v1/policies"),
          countClaims("open"),
          countClaims("awaiting_information"),
          countClaims("submitted"),
        ]);
      if (!current) return;
      setClaims(recent.claims);
      setPolicies(policyData.policies);
      setCounts({
        open: open.pagination.total,
        attention: information.pagination.total,
        submitted: submitted.pagination.total,
        review: 0,
      });
    };
    (staff ? loadStaff() : loadCustomer())
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : "Unable to load overview.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => { current = false; };
  }, [staff]);

  const queueCards = [
    { title: "Awaiting review", status: "submitted", count: counts.submitted, icon: FileClock },
    { title: "Awaiting information", status: "awaiting_information", count: counts.attention, icon: CircleAlert },
    { title: "Under review", status: "under_review", count: counts.review, icon: FileCheck2 },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl p-5 sm:p-8">
        <PageHeader
          eyebrow={staff ? "Operations" : "Your account"}
          title={staff ? "Claims at a glance" : `Good day, ${user?.first_name ?? "there"}`}
          description={staff ? "Prioritize active work and move directly into the claims queue." : "A clear view of your coverage and claim progress."}
          action={!staff ? <PrimaryLink href="/claims/new">Submit a claim</PrimaryLink> : undefined}
        />
        {error && <ErrorNotice message={error} />}
        {loading ? (
          <LoadingRows rows={4} />
        ) : staff ? (
          <>
            <section className="grid gap-4 md:grid-cols-3" aria-label="Operational queues">
              {queueCards.map(({ title, status, count, icon: Icon }) => (
                <Link key={status} href={`/claims?status=${status}`} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-400 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">{title}</span>
                    <Icon aria-hidden="true" className="h-5 w-5 text-slate-500" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold tabular-nums text-slate-950">{count}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-700">Open queue <ArrowRight className="h-4 w-4" /></span>
                </Link>
              ))}
            </section>
            <Card className="mt-7 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div><h3 className="font-semibold text-slate-950">Recently submitted claims</h3><p className="mt-1 text-sm text-slate-600">Latest items across the operational queue.</p></div>
                <Link href="/claims" className="text-sm font-semibold text-slate-800 hover:underline">All claims</Link>
              </div>
              <ClaimRows claims={[...claims].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6)} />
            </Card>
          </>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard title="Active policies" count={policies.filter((p) => p.status.toLowerCase() === "active").length} href="/policies" note="View your coverage" icon={BriefcaseBusiness} />
              <SummaryCard title="Open claims" count={counts.open} href="/claims?status=open" note="Track active claims" icon={FileClock} />
              <SummaryCard title="Needs your attention" count={counts.attention} href="/claims?status=awaiting_information" note="Requested information" icon={CircleAlert} />
              <SummaryCard title="Submitted claims" count={counts.submitted} href="/claims?status=submitted" note="Awaiting an initial review" icon={FileCheck2} />
            </section>
            {counts.attention > 0 && (
              <div className="mt-6 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold text-amber-950">Information requested for {counts.attention} {counts.attention === 1 ? "claim" : "claims"}</p><p className="mt-1 text-sm text-amber-900">Review the claim and contact the claims team to provide the requested details.</p></div>
                <Link href="/claims?status=awaiting_information" className="shrink-0 text-sm font-semibold text-amber-950 underline underline-offset-4">Review claims</Link>
              </div>
            )}
            <section className="mt-7 grid gap-6 xl:grid-cols-3">
              <Card className="overflow-hidden xl:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div><h3 className="font-semibold text-slate-950">Recent claim activity</h3><p className="mt-1 text-sm text-slate-600">Your latest submitted claims and current status.</p></div>
                  <Link href="/claims" className="text-sm font-semibold text-slate-800 hover:underline">All claims</Link>
                </div>
                {claims.length ? <ClaimRows claims={[...claims].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)).slice(0, 5)} /> : <div className="p-5"><EmptyState title="No claims yet" description="When you submit a claim against an eligible policy, its progress will appear here." action={<PrimaryLink href="/claims/new">Start a claim</PrimaryLink>} /></div>}
              </Card>
              <Card className="p-5">
                <div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-950">Your policies</h3><p className="mt-1 text-sm text-slate-600">{policies.length} on record</p></div><Link href="/policies" aria-label="View all policies" className="rounded p-2 text-slate-600 hover:bg-slate-100"><ArrowRight className="h-4 w-4" /></Link></div>
                <div className="mt-4 space-y-3">
                  {policies.slice(0, 4).map((policy) => (
                    <Link key={policy.id} href={`/policies/${policy.id}`} className="block rounded-lg border border-slate-200 p-3 hover:border-slate-400">
                      <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold text-slate-900">{policy.policy_number}</span><StatusBadge status={policy.status} /></div>
                      <p className="mt-1 text-xs text-slate-600">{policy.policy_type} · Coverage {formatMoney(policy.coverage_amount)}</p>
                    </Link>
                  ))}
                  {!policies.length && <p className="py-6 text-sm text-slate-600">No policies are currently available on your account.</p>}
                </div>
              </Card>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({ title, count, href, note, icon: Icon }: { title: string; count: number; href: string; note: string; icon: typeof BriefcaseBusiness }) {
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-400 hover:shadow-sm">
      <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-600">{title}</span><Icon aria-hidden="true" className="h-5 w-5 text-slate-500" /></div>
      <p className="mt-4 text-3xl font-semibold tabular-nums text-slate-950">{count}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </Link>
  );
}

function ClaimRows({ claims }: { claims: Claim[] }) {
  if (!claims.length) return <p className="px-5 py-8 text-sm text-slate-600">There are no claims to show.</p>;
  return (
    <>
      <div className="divide-y divide-slate-100 md:hidden">{claims.map((claim) => <Link key={claim.id} href={`/claims/${claim.id}`} className="block px-5 py-4"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-900">{claim.claim_number}</span><StatusBadge status={claim.status} /></div><p className="mt-2 text-sm text-slate-600">{formatMoney(claim.amount_claimed)} · Updated {formatDate(claim.updated_at)}</p></Link>)}</div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Claim</th><th className="px-5 py-3 font-semibold">Amount</th><th className="px-5 py-3 font-semibold">Submitted</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3" /></tr></thead>
          <tbody className="divide-y divide-slate-100">{claims.map((claim) => <tr key={claim.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/claims/${claim.id}`} className="font-semibold text-slate-900 hover:underline">{claim.claim_number}</Link><p className="mt-1 max-w-sm truncate text-xs text-slate-500">{claim.description}</p></td><td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums text-slate-900">{formatMoney(claim.amount_claimed)}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(claim.submitted_at)}</td><td className="px-5 py-4"><StatusBadge status={claim.status} /></td><td className="px-5 py-4"><Link href={`/claims/${claim.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">Open <ArrowRight className="h-4 w-4" /></Link></td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
