"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Overview from "@/components/Overview";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  useEffect(() => {
    if (ready && !user) router.replace("/login");
    else if (ready && user && user.role !== "customer") router.replace("/operations");
  }, [ready, router, user]);
  if (!ready || !user || user.role !== "customer") return null;
  return <Overview />;
}
