"use client";

import { useEffect, useState } from "react";

import DashboardExperience from "@/components/DashboardExperience";
import LockedState from "@/components/LockedState";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/authFetch";
import type { AllocationSector, AllocationTicker, SummaryResponse } from "@/lib/portfolio";

export default function DashboardPage() {
  const { token, user, loading } = useAuth();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [allocation, setAllocation] = useState<{
    tickers: AllocationTicker[];
    sectors: AllocationSector[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!token) return;

    const loadJson = async <T,>(path: string): Promise<T> => {
      const res = await authFetch(path, token);
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      return (await res.json()) as T;
    };

    Promise.all([
      loadJson<SummaryResponse>("/api/portfolio/summary"),
      loadJson<{ tickers: AllocationTicker[]; sectors: AllocationSector[] }>("/api/portfolio/allocation"),
    ])
      .then(([summaryPayload, allocationPayload]) => {
        if (active) {
          setSummary(summaryPayload);
          setAllocation(allocationPayload);
        }
      })
      .catch(() => {
        if (active) setError("Unable to load portfolio data.");
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <Shell>
        <section className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-sm">Loading portfolio...</section>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <LockedState />
      </Shell>
    );
  }

  if (error || !summary || !allocation) {
    return (
      <Shell>
        <section className="rounded-3xl bg-white p-8 text-sm text-rose-600 shadow-sm">
          {error ?? "Unable to load portfolio."}
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <DashboardExperience summary={summary} allocation={allocation} />
    </Shell>
  );
}
