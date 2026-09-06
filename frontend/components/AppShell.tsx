"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserCircle,
} from "lucide-react";


interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
}


const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Policies",
    href: "/policies",
    icon: ShieldCheck,
  },
  {
    name: "Claims",
    href: "/claims",
    icon: FileText,
  },
];


export default function AppShell({
  children,
  userName = "Customer",
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();


  function logout() {
    localStorage.removeItem("claimflow_token");
    localStorage.removeItem("claimflow_user");

    router.push("/login");
  }


  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-slate-200 px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
              CF
            </div>

            <div>
              <p className="font-semibold tracking-tight text-slate-900">
                ClaimFlow
              </p>

              <p className="text-xs text-slate-500">
                Claims management
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              pathname.startsWith(
                `${item.href}/`,
              );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />

                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <UserCircle className="h-9 w-9 text-slate-400" />

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {userName}
              </p>

              <p className="text-xs text-slate-500">
                Customer
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {pathname === "/dashboard"
                ? "Dashboard"
                : pathname
                    .split("/")
                    .filter(Boolean)
                    .map(
                      (part) =>
                        part.charAt(0).toUpperCase() +
                        part.slice(1),
                    )
                    .join(" / ")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">
                {userName}
              </p>

              <p className="text-xs text-slate-500">
                Customer
              </p>
            </div>

            <UserCircle className="h-8 w-8 text-slate-400" />
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}