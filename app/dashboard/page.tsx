"use client";

import { useEffect, useState } from "react";

import ChatExperience from "@/components/ChatExperience";
import DashboardExperience from "@/components/DashboardExperience";
import LockedState from "@/components/LockedState";
import ProfileSelector from "@/components/ProfileSelector";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/authFetch";
import type { AllocationSector, AllocationTicker, SummaryResponse } from "@/lib/portfolio";

export default function DashboardPage() {
  const { token, user, loading, selectedProfile, isDemo, demoSession } = useAuth();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [allocation, setAllocation] = useState<{
    tickers: AllocationTicker[];
    sectors: AllocationSector[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!token && !demoSession) return;

    setError(null);
    setSummary(null);
    setAllocation(null);

    const loadJson = async <T,>(path: string): Promise<T> => {
      const res = await authFetch(path, token, {
        headers: {
          ...(selectedProfile ? { "X-Moniq-Profile-Id": selectedProfile.id } : {}),
          ...(isDemo && demoSession ? { "X-Moniq-Demo-Session": demoSession.id } : {}),
        },
      });
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
  }, [token, selectedProfile, isDemo, demoSession]);

  if (loading) {
    return (
      <Shell>
        <section className="rounded-lg bg-white p-8 text-sm text-slate-500 shadow-sm">Loading portfolio...</section>
      </Shell>
    );
  }

  if (!user && !isDemo) {
    return (
      <Shell>
        <LockedState />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <header className="rounded-lg bg-white p-8 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {selectedProfile?.profileType === "watchlist"
                  ? "Watchlist"
                  : selectedProfile?.profileType === "kid"
                  ? "Kid profile"
                  : "Portfolio"}
              </p>
              <h1 className="font-display text-3xl text-slate-900">
                {selectedProfile?.displayName ?? "Portfolio overview"}
              </h1>
              <p className="mt-2 text-sm text-slate-500">Overview and assistant share this selected profile.</p>
            </div>
            <div className="mt-6">
              <ProfileSelector />
            </div>
          </header>

          {error ? (
            <section className="rounded-lg bg-white p-8 text-sm text-rose-600 shadow-sm">
              {error}
            </section>
          ) : !summary || !allocation ? (
            <section className="rounded-lg bg-white p-8 text-sm text-slate-500 shadow-sm">
              Loading selected profile...
            </section>
          ) : allocation.tickers.length === 0 && allocation.sectors.length === 0 ? (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">No data yet</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Upload data for {selectedProfile?.displayName ?? "this profile"}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-500">
                This profile is ready. Upload a portfolio CSV and Moniq will compute holdings, allocation, and insights for this selected profile.
              </p>
              <a
                href="/upload"
                className="mt-5 inline-flex rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Upload data
              </a>
            </section>
          ) : (
            <DashboardExperience summary={summary} allocation={allocation} showHeader={false} />
          )}
        </div>

        <aside className="min-w-0 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
          <ChatExperience embedded mode={isDemo ? "demo" : "app"} />
        </aside>
      </div>
    </Shell>
  );
}
