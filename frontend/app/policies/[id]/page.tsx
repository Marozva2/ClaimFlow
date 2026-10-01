"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import AppShell from "@/components/AppShell";
import { Card, EmptyState, ErrorNotice, formatDate, formatMoney, LoadingRows, PageHeader, StatusBadge } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { Claim, Policy } from "@/types";

interface ClaimListResponse { claims: Claim[]; pagination: { total: number } }

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<Policy>(`/api/v1/policies/${id}`),
      apiRequest<ClaimListResponse>(`/api/v1/claims?page=1&per_page=100&policy_id=${id}`),
    ])
      .then(([policyData, claimData]) => {
        if (!active) return;
        setPolicy(policyData);
        setClaims(claimData.claims);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load policy.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-5 sm:p-8">
        <p className="mb-4 text-sm"><Link href="/policies" className="font-medium text-slate-600 hover:underline">Policies</Link><span className="px-2 text-slate-400">/</span><span className="text-slate-500">Policy details</span></p>
        {error && <ErrorNotice message={error} />}
        {loading ? <LoadingRows rows={3} /> : policy ? (
          <>
            <PageHeader eyebrow={policy.policy_type} title={policy.policy_number} description="Policy coverage and the claims filed against this policy." action={<StatusBadge status={policy.status} />} />
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <h3 className="font-semibold text-slate-950">Policy information</h3>
                <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <Detail label="Policy type" value={policy.policy_type} />
                  <Detail label="Policy number" value={policy.policy_number} />
                  <Detail label="Coverage amount" value={formatMoney(policy.coverage_amount)} />
                  <Detail label="Premium" value={formatMoney(policy.premium)} />
                  <Detail label="Effective from" value={formatDate(policy.start_date)} />
                  <Detail label="Effective through" value={formatDate(policy.end_date)} />
                </dl>
              </Card>
              <Card className="p-5">
                <h3 className="font-semibold text-slate-950">At a glance</h3>
                <p className="mt-5 text-3xl font-semibold text-slate-950">{claims.length}</p>
                <p className="text-sm text-slate-600">claims linked to this policy</p>
                <Link href={`/claims?policy_id=${policy.id}`} className="mt-5 inline-block text-sm font-semibold text-slate-800 hover:underline">View policy claims →</Link>
              </Card>
            </div>
            <Card className="mt-6 overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4"><h3 className="font-semibold text-slate-950">Claims on this policy</h3><p className="mt-1 text-sm text-slate-600">Claim history linked to {policy.policy_number}.</p></div>
              {!claims.length ? <div className="p-5"><EmptyState title="No claims against this policy" description="Claims submitted against this policy will appear here." /></div> : <div className="divide-y divide-slate-100">{claims.map((claim) => <Link key={claim.id} href={`/claims/${claim.id}`} className="flex flex-col justify-between gap-3 p-5 hover:bg-slate-50 sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-950">{claim.claim_number}</p><p className="mt-1 text-sm text-slate-600">{claim.description}</p></div><div className="flex items-center justify-between gap-4 sm:justify-end"><span className="font-medium tabular-nums">{formatMoney(claim.amount_claimed)}</span><StatusBadge status={claim.status} /></div></Link>)}</div>}
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>;
}
