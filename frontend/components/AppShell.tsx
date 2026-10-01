"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { ReactNode, useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { UserRole } from "@/types";

const roleNames: Record<UserRole, string> = {
  customer: "Customer",
  claims_officer: "Claims officer",
  admin: "Administrator",
};

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, signOut } = useAuth();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
    if (
      ready &&
      user?.role === "customer" &&
      (pathname.startsWith("/operations") ||
        pathname.startsWith("/assessments"))
    ) {
      router.replace("/dashboard");
    }
    if (
      ready &&
      user &&
      ((pathname.startsWith("/admin") && user.role !== "admin") ||
        (pathname === "/claims/new" && user.role !== "customer"))
    ) {
      router.replace(user.role === "customer" ? "/dashboard" : "/operations");
    }
  }, [pathname, ready, router, user]);

  if (!ready || !user) {
    return (
      <main className="mx-auto w-full max-w-7xl p-8" aria-label="Loading account">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-8 h-64 animate-pulse rounded-xl bg-white" />
      </main>
    );
  }

  const dashboardHref = user.role === "customer" ? "/dashboard" : "/operations";
  const navigation = [
    {
      name: user.role === "customer" ? "Dashboard" : "Operations overview",
      href: dashboardHref,
      icon: LayoutDashboard,
    },
    { name: "Policies", href: "/policies", icon: ShieldCheck },
    { name: user.role === "customer" ? "My claims" : "Claims queue", href: "/claims", icon: FileText },
    ...(user.role !== "customer"
      ? [{ name: "Assessments", href: "/assessments", icon: ClipboardList }]
      : []),
    ...(user.role === "admin"
      ? [
          { name: "Users", href: "/admin/users", icon: UserCircle },
          { name: "Audit activity", href: "/admin/audit", icon: ClipboardList },
        ]
      : []),
  ];
  const pageTitle = navigation.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )?.name ?? pathname.split("/").filter(Boolean).join(" / ");

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center border-b border-slate-200 px-6">
          <Link href={dashboardHref} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
              CF
            </span>
            <span>
              <span className="block font-semibold text-slate-900">ClaimFlow</span>
              <span className="block text-xs text-slate-500">Insurance operations</span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6" aria-label="Main navigation">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          {navigation.map(({ name, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <UserCircle aria-hidden="true" className="h-9 w-9 text-slate-400" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-slate-500">{roleNames[user.role]}</p>
            </div>
          </div>
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {roleNames[user.role]}
            </p>
            <h1 className="text-sm font-semibold capitalize text-slate-900">
              {pageTitle || "Workspace"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-medium text-slate-900">
                {user.first_name} {user.last_name}
              </span>
              <span className="block text-xs text-slate-500">{user.email}</span>
            </span>
            <UserCircle aria-hidden="true" className="h-8 w-8 text-slate-400" />
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:hidden" aria-label="Mobile navigation">
          {navigation.map(({ name, href }) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              {name}
            </Link>
          ))}
          <button onClick={() => void signOut()} className="whitespace-nowrap rounded px-3 py-2 text-sm text-slate-600">
            Sign out
          </button>
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
