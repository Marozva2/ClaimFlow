"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppShell from "@/components/AppShell";
import { Card, ErrorNotice, formatDate, formatMoney, LoadingRows, PageHeader, StatusBadge } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { Policy, Claim } from "@/types";

interface PoliciesResponse { policies: Policy[] }

export default function NewClaimPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyId, setPolicyId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"details" | "review">("details");
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  useEffect(() => {
    apiRequest<PoliciesResponse>("/api/v1/policies")
      .then((result) => setPolicies(result.policies))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load eligible policies."))
      .finally(() => setLoadingPolicies(false));
  }, []);
  const eligiblePolicies = useMemo(() => policies.filter((policy) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return policy.status.toLowerCase() === "active" && policy.start_date <= today && policy.end_date >= today;
  }), [policies]);
  const selectedPolicy = eligiblePolicies.find((policy) => policy.id === Number(policyId));
  const numericAmount = Number(amount);

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError("");
    if (!selectedPolicy) {
      setFieldError("Choose an eligible active policy.");
      return;
    }
    if (!description.trim()) {
      setFieldError("Describe what happened.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFieldError("Enter a claim amount greater than zero.");
      return;
    }
    if (numericAmount > selectedPolicy.coverage_amount) {
      setFieldError("The claimed amount must not exceed this policy's coverage.");
      return;
    }
    setStep("review");
  }

  async function submitClaim() {
    if (!selectedPolicy) return;
    setSubmitting(true);
    setError("");
    try {
      const claim = await apiRequest<Claim>("/api/v1/claims", {
        method: "POST",
        body: JSON.stringify({
          policy_id: selectedPolicy.id,
          description: description.trim(),
          amount_claimed: numericAmount,
        }),
      });
      router.replace(`/claims/${claim.id}?submitted=1`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit claim.");
      setStep("details");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <p className="mb-4 text-sm"><Link href="/claims" className="font-medium text-slate-600 hover:underline">Claims</Link><span className="px-2 text-slate-400">/</span><span className="text-slate-500">New claim</span></p>
        <PageHeader eyebrow="Customer claim" title="Submit a claim" description="Choose the policy first, then provide the incident details and review them before submission." />
        {error && <ErrorNotice message={error} />}
        {loadingPolicies ? <LoadingRows rows={3} /> : step === "details" ? (
          <form onSubmit={review} className="space-y-5">
            <Card className="p-5">
              <fieldset>
                <legend className="font-semibold text-slate-950">1. Select an eligible policy <span className="text-rose-700">*</span></legend>
                <p className="mt-1 text-sm text-slate-600">Only policies active today are shown.</p>
                {!eligiblePolicies.length ? <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">No eligible active policy is available for claim submission.</p> : <div className="mt-4 grid gap-3">{eligiblePolicies.map((policy) => <label key={policy.id} className={`cursor-pointer rounded-lg border p-4 ${policyId === String(policy.id) ? "border-slate-800 bg-slate-50 ring-1 ring-slate-800" : "border-slate-200 hover:border-slate-400"}`}><span className="flex items-start gap-3"><input type="radio" name="policy" value={policy.id} checked={policyId === String(policy.id)} onChange={() => setPolicyId(String(policy.id))} className="mt-1 accent-slate-900" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-slate-950">{policy.policy_number} · {policy.policy_type}</strong><StatusBadge status={policy.status} /></span><span className="mt-2 block text-sm text-slate-600">Coverage {formatMoney(policy.coverage_amount)} · Valid through {formatDate(policy.end_date)}</span></span></span></label>)}</div>}
              </fieldset>
            </Card>
            <Card className="space-y-4 p-5">
              <h3 className="font-semibold text-slate-950">2. Describe the claim</h3>
              <div><label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-slate-700">Amount claimed (KES) <span className="text-rose-700">*</span></label><input id="amount" type="number" min="0.01" step="0.01" max={selectedPolicy?.coverage_amount} value={amount} onChange={(event) => setAmount(event.target.value)} required aria-describedby="amount-hint" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 sm:max-w-sm" /><p id="amount-hint" className="mt-1 text-xs text-slate-500">{selectedPolicy ? `Policy coverage limit: ${formatMoney(selectedPolicy.coverage_amount)}.` : "Select a policy to see its coverage limit."}</p></div>
              <div><label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">What happened? <span className="text-rose-700">*</span></label><textarea id="description" rows={5} maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" placeholder="Include the incident date, location, and a concise description." /><p className="mt-1 text-right text-xs text-slate-500">{description.length}/4000</p></div>
            </Card>
            {fieldError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{fieldError}</p>}
            <div className="flex justify-end"><button disabled={!eligiblePolicies.length} type="submit" className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Review claim</button></div>
          </form>
        ) : (
          <Card className="p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Final review · Step 2 of 2</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Confirm before submitting</h3>
            <p className="mt-2 text-sm text-slate-600">Submission records this claim with the policy and amount shown below. The claims team will review it next.</p>
            <dl className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200">
              <ReviewRow label="Policy" value={selectedPolicy ? `${selectedPolicy.policy_number} · ${selectedPolicy.policy_type}` : "No policy selected"} />
              <ReviewRow label="Coverage" value={selectedPolicy ? formatMoney(selectedPolicy.coverage_amount) : "—"} />
              <ReviewRow label="Claim amount" value={formatMoney(numericAmount)} />
              <ReviewRow label="Incident details" value={description.trim()} />
            </dl>
            <p className="mt-4 text-xs text-slate-500">Supporting document uploads are not available in the current claims API.</p>
            <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row"><button type="button" onClick={() => setStep("details")} disabled={submitting} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800">Back and edit</button><button type="button" onClick={() => void submitClaim()} disabled={submitting} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{submitting ? "Submitting claim…" : "Submit claim"}</button></div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 p-4 sm:grid-cols-[10rem_1fr] sm:gap-4"><dt className="text-sm font-medium text-slate-600">{label}</dt><dd className="whitespace-pre-wrap text-sm font-medium text-slate-950">{value}</dd></div>;
}
