"use client";

import { useAuth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import Overview from "@/components/Overview";

export default function OperationsPage() {
  const { user, ready } = useAuth();
  if (!ready || !user || user.role === "customer") {
    return <AppShell><div className="p-8" /></AppShell>;
  }
  return <Overview />;
}
