"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import AppShell from "@/components/AppShell";
import PaginationControls from "@/components/PaginationControls";
import { Card, EmptyState, ErrorNotice, formatDate, LoadingRows, PageHeader, StatusBadge } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { Pagination, User } from "@/types";

interface UsersResponse { users: User[]; pagination: Pagination }
const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), per_page: String(PAGE_SIZE) });
      if (search.trim()) params.set("q", search.trim());
      if (role) params.set("role", role);
      setLoading(true);
      setError("");
      apiRequest<UsersResponse>(`/api/v1/admin/users?${params}`)
        .then((result) => { setUsers(result.users); setPagination(result.pagination); })
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load users."))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [page, role, search]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl p-5 sm:p-8">
        <PageHeader eyebrow="Administration" title="Users" description="Read-only user directory for governance and operational visibility." />
        {error && <ErrorNotice message={error} />}
        <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5"><Search aria-hidden="true" className="h-4 w-4 text-slate-500" /><span className="sr-only">Search users</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or email" className="w-full text-sm outline-none" /></label>
          <label className="text-xs font-medium text-slate-600">Role<select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">All roles</option><option value="customer">Customer</option><option value="claims_officer">Claims officer</option><option value="admin">Administrator</option></select></label>
        </Card>
        {loading ? <LoadingRows /> : !users.length ? <EmptyState title="No users found" description="Try a different search or role filter." /> : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Registered</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id}><td className="px-5 py-4"><p className="font-semibold text-slate-950">{user.first_name} {user.last_name}</p><p className="mt-1 text-slate-600">{user.email}</p><p className="mt-1 text-xs text-slate-500">User ID {user.id}</p></td><td className="px-5 py-4"><StatusBadge status={user.role} /></td><td className="px-5 py-4 text-slate-600">{formatDate(user.created_at)}</td></tr>)}</tbody>
              </table>
            </div>
            <PaginationControls page={page} setPage={setPage} pagination={pagination} />
          </Card>
        )}
        <p className="mt-4 text-xs text-slate-500">Account suspension and role changes are not available through the current API; no destructive controls are shown.</p>
      </div>
    </AppShell>
  );
}
