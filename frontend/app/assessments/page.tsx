"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import AppShell from "@/components/AppShell";
import { Card, EmptyState, ErrorNotice, formatDate, formatMoney, LoadingRows, PageHeader, StatusBadge } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Assessment, Claim } from "@/types";

interface ClaimsResponse { claims: Claim[] }
interface AssessmentsResponse { assessments: Assessment[] }

export default function AssessmentsPage() {
  return <Suspense fallback={<div className="p-8"><LoadingRows /></div>}><AssessmentsWorkspace /></Suspense>;
}

function AssessmentsWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, ready } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [claimId, setClaimId] = useState(() => params.get("claim_id") ?? "");
  const [recommendation, setRecommendation] = useState("approve");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user?.role === "customer") router.replace("/dashboard");
  }, [ready, router, user]);

  useEffect(() => {
    if (!ready || !user || user.role === "customer") return;
    Promise.all([
      apiRequest<ClaimsResponse>("/api/v1/claims"),
      apiRequest<AssessmentsResponse>("/api/v1/assessments"),
    ])
      .then(([claimData, assessmentData]) => {
        setClaims(claimData.claims);
        setAssessments(assessmentData.assessments);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load assessments."))
      .finally(() => setLoading(false));
  }, [ready, user]);

  const reviewable = useMemo(() => claims.filter((claim) => claim.status === "under_review"), [claims]);
  const selectedClaim = reviewable.find((claim) => claim.id === Number(claimId));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedClaim) {
      setError("Select a claim that is currently under review.");
      return;
    }
    if (recommendation === "approve" && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
      setError("Enter a positive recommended amount for an approval recommendation.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiRequest<Assessment>("/api/v1/assessments", {
        method: "POST",
        body: JSON.stringify({
          claim_id: selectedClaim.id,
          recommendation,
          ...(recommendation === "approve" ? { approved_amount: Number(amount) } : {}),
          notes: notes.trim() || null,
        }),
      });
      setAssessments((current) => [result, ...current]);
      setSuccess("Assessment recorded. The claim remains under review until a separate workflow decision is made.");
      setNotes("");
      setAmount("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to record assessment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (ready && user?.role === "customer") return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl p-5 sm:p-8">
        <PageHeader eyebrow="Operations" title="Assessments" description="Record a recommendation and supporting notes for a claim under review. Assessment history is retained." />
        {error && <ErrorNotice message={error} />}
        {success && <p role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">{success}</p>}
        {loading ? <LoadingRows rows={3} /> : (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
            <Card className="p-5">
              <h3 className="font-semibold text-slate-950">Record assessment</h3>
              <p className="mt-1 text-sm text-slate-600">The API accepts a recommendation; approval or rejection is a separate lifecycle action.</p>
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div><label htmlFor="claimId" className="mb-1.5 block text-sm font-medium text-slate-700">Claim under review <span className="text-rose-700">*</span></label><select id="claimId" value={claimId} onChange={(event) => setClaimId(event.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Select a claim</option>{reviewable.map((claim) => <option key={claim.id} value={claim.id}>{claim.claim_number} · {formatMoney(claim.amount_claimed)}</option>)}</select>{!reviewable.length && <p className="mt-1 text-xs text-slate-600">There are no claims currently under review.</p>}</div>
                {selectedClaim && <div className="rounded-lg bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><Link href={`/claims/${selectedClaim.id}`} className="font-semibold text-slate-900 hover:underline">{selectedClaim.claim_number}</Link><StatusBadge status={selectedClaim.status} /></div><p className="mt-1 text-sm text-slate-600">{selectedClaim.description}</p><p className="mt-2 text-sm font-semibold text-slate-900">Claimed {formatMoney(selectedClaim.amount_claimed)}</p></div>}
                <div><label htmlFor="recommendation" className="mb-1.5 block text-sm font-medium text-slate-700">Recommendation <span className="text-rose-700">*</span></label><select id="recommendation" value={recommendation} onChange={(event) => setRecommendation(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="approve">Recommend approval</option><option value="reject">Recommend rejection</option><option value="request_information">Request more information</option></select></div>
                {recommendation === "approve" && <div><label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-slate-700">Recommended amount (KES) <span className="text-rose-700">*</span></label><input id="amount" type="number" min="0.01" step="0.01" max={selectedClaim?.amount_claimed} value={amount} onChange={(event) => setAmount(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></div>}
                <div><label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-slate-700">Assessment notes</label><textarea id="notes" rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder="Record the relevant findings and reasoning." /></div>
                <button disabled={submitting || !reviewable.length} type="submit" className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Recording assessment…" : "Submit assessment"}</button>
              </form>
            </Card>
            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4"><h3 className="font-semibold text-slate-950">Previous assessments</h3><p className="mt-1 text-sm text-slate-600">Historical records are shown without overwriting prior recommendations.</p></div>
              {!assessments.length ? <div className="p-5"><EmptyState title="No assessments recorded" description="Assessments submitted by claims staff will appear here." /></div> : <div className="divide-y divide-slate-100">{assessments.map((assessment) => <div key={assessment.id} className="p-5"><div className="flex items-center justify-between gap-3"><Link href={`/claims/${assessment.claim_id}`} className="font-semibold text-slate-900 hover:underline">Claim {assessment.claim_id}</Link><time className="text-xs text-slate-500">{formatDate(assessment.assessed_at)}</time></div><p className="mt-2 text-sm font-medium capitalize text-slate-800">{assessment.recommendation.replaceAll("_", " ")}</p>{assessment.approved_amount !== null && <p className="mt-1 text-sm text-slate-700">{formatMoney(assessment.approved_amount)}</p>}{assessment.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{assessment.notes}</p>}</div>)}</div>}
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
