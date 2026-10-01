"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import AppShell from "@/components/AppShell";
import { Card, ErrorNotice, formatDate, formatMoney, LoadingRows, PageHeader, StatusBadge } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Assessment, AuditLog, Claim, Policy } from "@/types";

interface AssessmentsResponse { assessments: Assessment[] }
interface AuditResponse { events: AuditLog[] }
const lifecycle = ["submitted", "under_review", "awaiting_information", "approved", "settled", "closed"];
const transitionChoices: Record<string, { label: string; status: string; confirm?: string }[]> = {
  submitted: [{ label: "Start review", status: "under_review" }],
  under_review: [
    { label: "Request information", status: "awaiting_information" },
    { label: "Reject claim", status: "rejected", confirm: "Reject this claim? This decision will be recorded in the audit history." },
    { label: "Approve claim", status: "approved" },
  ],
  awaiting_information: [{ label: "Resume review", status: "under_review" }],
  approved: [{ label: "Mark as settled", status: "settled", confirm: "Record this claim as settled?" }],
  settled: [{ label: "Close claim", status: "closed", confirm: "Close this claim? This records the final lifecycle state." }],
};

export default function ClaimDetailPage() {
  return <Suspense fallback={<div className="p-8"><LoadingRows rows={4} /></div>}><ClaimDetails /></Suspense>;
}

function ClaimDetails() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { user } = useAuth();
  const isStaff = user?.role === "claims_officer" || user?.role === "admin";
  const [claim, setClaim] = useState<Claim | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [events, setEvents] = useState<AuditLog[]>([]);
  const [approvedAmount, setApprovedAmount] = useState("");
  const returnToCandidate = params.get("returnTo");
  const returnTo = returnToCandidate?.startsWith("/claims") ? returnToCandidate : "/claims";
  const [notice, setNotice] = useState(() => params.get("submitted") === "1" ? "Claim submitted successfully. Your claim number and current status are shown below." : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    let active = true;
    const requests = [
      apiRequest<Claim>(`/api/v1/claims/${id}`),
    ];
    Promise.all(requests)
      .then(async ([claimData]) => {
        const [policyData, assessmentData, auditData] = await Promise.all([
          apiRequest<Policy>(`/api/v1/policies/${claimData.policy_id}`),
          isStaff
            ? apiRequest<AssessmentsResponse>(
                `/api/v1/claims/${claimData.id}/assessments`,
              )
            : Promise.resolve({ assessments: [] }),
          apiRequest<AuditResponse>(`/api/v1/claims/${claimData.id}/audit`),
        ]);
        if (!active) return;
        setClaim(claimData);
        setPolicy(policyData);
        setAssessments(assessmentData.assessments.filter((item) => item.claim_id === claimData.id));
        setEvents(auditData.events);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load claim details.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, isStaff]);

  const hasApprovalAssessment = assessments.some((item) => item.recommendation === "approve");
  const hasRejectionAssessment = assessments.some((item) => item.recommendation === "reject");
  const actions = useMemo(() => transitionChoices[claim?.status.toLowerCase() ?? ""] ?? [], [claim?.status]);
  const steps = claim?.status.toLowerCase() === "rejected"
    ? ["submitted", "under_review", "rejected"]
    : lifecycle;
  const progressIndex = steps.indexOf(claim?.status.toLowerCase() ?? "");

  async function transition(status: string, confirm?: string) {
    if (!claim) return;
    setAmountError("");
    let amount: number | undefined;
    if (status === "approved") {
      amount = Number(approvedAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setAmountError("Enter a positive approved amount before approval.");
        return;
      }
      if (amount > Math.min(claim.amount_claimed, policy?.coverage_amount ?? 0)) {
        setAmountError("Approved amount cannot exceed the claim or policy coverage.");
        return;
      }
    }
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError("");
    try {
      const updated = await apiRequest<Claim>(`/api/v1/claims/${claim.id}/transitions`, {
        method: "POST",
        body: JSON.stringify({ status, ...(amount === undefined ? {} : { amount_approved: amount }) }),
      });
      setClaim((current) => current ? { ...current, ...updated } : updated);
      setNotice(`Claim status updated to ${updated.status.replaceAll("_", " ")}.`);
      try {
        const audit = await apiRequest<AuditResponse>(
          `/api/v1/claims/${claim.id}/audit`,
        );
        setEvents(audit.events);
      } catch {
        setError("The claim was updated, but its activity timeline could not be refreshed.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update claim.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl p-5 sm:p-8">
        <p className="mb-4 text-sm"><Link href={returnTo} className="font-medium text-slate-600 hover:underline">Back to claims</Link><span className="px-2 text-slate-400">/</span><span className="text-slate-500">Claim details</span></p>
        {notice && <div role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">{notice}</div>}
        {error && <ErrorNotice message={error} />}
        {loading ? <LoadingRows rows={4} /> : claim ? (
          <>
            <PageHeader eyebrow={policy?.policy_type ?? "Claim"} title={claim.claim_number} description={claim.description} action={<StatusBadge status={claim.status} />} />
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Amount claimed" value={formatMoney(claim.amount_claimed)} />
              <Metric label="Policy" value={policy?.policy_number ?? `Policy ${claim.policy_id}`} />
              <Metric label="Submitted" value={formatDate(claim.submitted_at)} />
              <Metric label="Last updated" value={formatDate(claim.updated_at)} />
            </section>
            <Card className="mt-6 p-5">
              <h3 className="font-semibold text-slate-950">Claim lifecycle</h3>
              <p className="mt-1 text-sm text-slate-600">The highlighted step reflects the current status returned by the claims service.</p>
              <ol className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="Claim lifecycle progress">
                {steps.map((status, index) => {
                  const current = status === claim.status.toLowerCase();
                  const complete = progressIndex >= 0 && index < progressIndex;
                  return <li key={status} aria-current={current ? "step" : undefined} className={`rounded-lg border p-3 text-sm ${current ? "border-slate-900 bg-slate-900 text-white" : complete ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-600"}`}><span className="block text-xs font-medium opacity-75">Step {index + 1}</span><span className="mt-1 block font-semibold">{status.replaceAll("_", " ")}</span></li>;
                })}
              </ol>
            </Card>
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-6">
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-950">Policy and financial information</h3>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Metric label="Policy number" value={policy?.policy_number ?? `Policy ${claim.policy_id}`} />
                    <Metric label="Coverage limit" value={policy ? formatMoney(policy.coverage_amount) : "Not available"} />
                    <Metric label="Claimed amount" value={formatMoney(claim.amount_claimed)} />
                    <Metric label="Approved amount" value={claim.amount_approved === null ? "Not decided" : formatMoney(claim.amount_approved)} />
                  </dl>
                  {isStaff && claim.customer && <div className="mt-5 border-t border-slate-200 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Policyholder</p><p className="mt-1 font-semibold text-slate-950">{claim.customer.first_name} {claim.customer.last_name}</p><p className="mt-1 text-sm text-slate-600">{claim.customer.email}</p></div>}
                </Card>
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-950">Assessments</h3><p className="mt-1 text-sm text-slate-600">Recorded assessment recommendations.</p></div>{isStaff && claim.status === "under_review" && <Link href={`/assessments?claim_id=${claim.id}`} className="text-sm font-semibold text-slate-800 hover:underline">Record assessment</Link>}</div>
                  {!isStaff ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Assessment records are available to claims staff.</p> : !assessments.length ? <p className="mt-4 text-sm text-slate-600">No assessments have been recorded.</p> : <div className="mt-4 divide-y divide-slate-100">{assessments.map((assessment) => <div key={assessment.id} className="py-4 first:pt-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium capitalize text-slate-900">{assessment.recommendation.replaceAll("_", " ")}</p><time className="text-xs text-slate-500">{formatDate(assessment.assessed_at)}</time></div>{assessment.approved_amount !== null && <p className="mt-1 text-sm text-slate-700">Recommended amount {formatMoney(assessment.approved_amount)}</p>}{assessment.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{assessment.notes}</p>}</div>)}</div>}
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-950">Activity</h3>
                  <p className="mt-1 text-sm text-slate-600">Chronological record of claim submission and operational actions.</p>
                  {!events.length ? <p className="mt-4 text-sm text-slate-600">No activity events are available yet.</p> : <ol className="mt-5 space-y-0">{events.map((event) => <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0"><span className="relative flex w-3 shrink-0 justify-center"><span className="absolute top-2 h-full w-px bg-slate-200 last:hidden" /><span className="relative mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-slate-700 bg-white" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{event.action.replaceAll("_", " ")}</p><time className="text-xs text-slate-500">{new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</time></div><p className="mt-1 text-sm text-slate-600">{event.description}</p><p className="mt-1 text-xs text-slate-500">{event.user_id === null ? "System" : `Actor ${event.user_id}`}</p></div></li>)}</ol>}
                </Card>
              </div>
              {isStaff && (
                <Card className="h-fit p-5">
                  <h3 className="font-semibold text-slate-950">Next permitted action</h3>
                  <p className="mt-1 text-sm text-slate-600">Actions are validated by the claims service before the status changes.</p>
                  {claim.status === "under_review" && (
                    <div className="mt-4">
                      <label htmlFor="approvedAmount" className="mb-1.5 block text-sm font-medium text-slate-700">Approved amount (KES)</label>
                      <input id="approvedAmount" type="number" min="0.01" step="0.01" max={Math.min(claim.amount_claimed, policy?.coverage_amount ?? claim.amount_claimed)} value={approvedAmount} onChange={(event) => setApprovedAmount(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                      {!hasApprovalAssessment && <p className="mt-2 text-xs text-slate-600">Record an approval assessment before approving this claim.</p>}
                    </div>
                  )}
                  {amountError && <p role="alert" className="mt-3 text-sm text-rose-800">{amountError}</p>}
                  <div className="mt-4 space-y-2">
                    {actions.filter((action) => (action.status !== "approved" || hasApprovalAssessment) && (action.status !== "rejected" || hasRejectionAssessment)).map((action) => (
                      <button key={action.status} type="button" disabled={busy} onClick={() => void transition(action.status, action.confirm)} className={`w-full rounded-lg px-3 py-2.5 text-sm font-semibold disabled:opacity-50 ${action.status === "rejected" ? "border border-rose-300 text-rose-900 hover:bg-rose-50" : "bg-slate-900 text-white hover:bg-slate-800"}`}>{busy ? "Processing…" : action.label}</button>
                    ))}
                    {claim.status === "under_review" && (!hasApprovalAssessment || !hasRejectionAssessment) && <Link href={`/assessments?claim_id=${claim.id}`} className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">Record assessment</Link>}
                    {claim.status === "under_review" && !hasRejectionAssessment && <p className="mt-2 text-xs text-slate-600">A rejection recommendation is required before this claim can be rejected.</p>}
                    {!actions.length && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No further operational action is available in this status.</p>}
                  </div>
                  {(claim.status === "rejected" || claim.status === "closed") && <p className="mt-3 text-xs text-slate-500">This is a terminal state in the current workflow.</p>}
                </Card>
              )}
              {!isStaff && claim.status === "awaiting_information" && <Card className="h-fit border-amber-300 bg-amber-50 p-5 lg:col-start-2"><h3 className="font-semibold text-amber-950">Information requested</h3><p className="mt-2 text-sm text-amber-900">The claims team needs additional information. Supporting documents and responses are not yet available in the customer API; contact the claims team to provide the requested details.</p></Card>}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-semibold tabular-nums text-slate-950">{value}</dd></div>;
}
