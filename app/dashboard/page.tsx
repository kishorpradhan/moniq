"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Shell from "@/components/Shell";
import PositionsList from "@/components/PositionsList";
import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/authFetch";

type SummaryResponse = {
  asOfDate: string | null;
  totalValue: number;
  totalInvested: number;
  unrealizedPl: number;
  unrealizedPct: number | null;
  realizedPl: number;
};

type AllocationTicker = {
  ticker: string;
  weight: number | null;
  marketValue: number;
};

type AllocationSector = {
  sector: string;
  weight: number | null;
  marketValue: number;
};

function formatMoney(value: number, digits = 0) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  });
}

function formatPct(value: number | null, digits = 1) {
  if (value === null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, user, loading } = useAuth();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [allocation, setAllocation] = useState<{
    tickers: AllocationTicker[];
    sectors: AllocationSector[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?next=/dashboard`);
    }
  }, [loading, user, router]);

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

  const tickers = useMemo(() => allocation?.tickers.slice(0, 6) ?? [], [allocation]);
  const sectorSlice = useMemo(() => allocation?.sectors.slice(0, 4) ?? [], [allocation]);

  if (loading || !user) {
    return (
      <Shell>
        <section className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-sm">Loading portfolio…</section>
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
      <header className="space-y-2 rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Portfolio tracker</p>
        <h1 className="font-display text-3xl text-slate-900">Portfolio overview</h1>
        <p className="text-sm text-slate-500">
          Last updated: {summary.asOfDate ?? "—"}
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-3xl bg-[#f7f3eb] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total value</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatMoney(summary.totalValue)}</p>
          <p className="mt-1 text-sm text-slate-500">Live market value</p>
        </div>
        <div className="rounded-3xl bg-[#f7f3eb] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total invested</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatMoney(summary.totalInvested)}</p>
          <p className="mt-1 text-sm text-slate-500">Cost basis</p>
        </div>
        <div className="rounded-3xl bg-[#f7f3eb] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Unrealized P&amp;L</p>
          <p className={`mt-3 text-3xl font-semibold ${summary.unrealizedPl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {summary.unrealizedPl >= 0 ? "+" : ""}
            {formatMoney(summary.unrealizedPl)}
          </p>
          <p className="mt-1 text-sm text-emerald-600">{formatPct(summary.unrealizedPct, 1)}</p>
        </div>
        <div className="rounded-3xl bg-[#f7f3eb] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Realized P&amp;L</p>
          <p className={`mt-3 text-3xl font-semibold ${summary.realizedPl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {summary.realizedPl >= 0 ? "+" : ""}
            {formatMoney(summary.realizedPl)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Closed positions</p>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Portfolio allocation</h2>
            <p className="text-sm text-slate-500">Ticker weights based on open market value</p>
          </div>
        </div>
        <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="flex h-full">
            {tickers.map((item, index) => (
              <div
                key={item.ticker}
                className={`h-full ${index % 2 === 0 ? "bg-emerald-500" : "bg-blue-500"}`}
                style={{ width: `${(item.weight ?? 0) * 100}%` }}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {tickers.map((item, index) => (
            <div key={item.ticker} className="flex items-center gap-2 text-slate-600">
              <span className={`h-2 w-2 rounded-full ${index % 2 === 0 ? "bg-emerald-500" : "bg-blue-500"}`} />
              <span className="font-semibold text-slate-800">{item.ticker}</span>
              <span>{formatPct(item.weight, 1)}</span>
              <span className="text-slate-400">{formatMoney(item.marketValue)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900">Sector composition</h3>
          <p className="text-sm text-slate-500">Open positions only</p>
          <div className="mt-4 space-y-4">
            {sectorSlice.map((sector) => (
              <div key={sector.sector} className="space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>{sector.sector}</span>
                  <span>{formatPct(sector.weight, 1)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-800"
                    style={{ width: `${(sector.weight ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-[#0f172a] p-6 text-white shadow-sm">
          <h3 className="text-lg font-semibold">Insights</h3>
          <p className="mt-2 text-sm text-slate-200">Top holdings drive most of the portfolio return. Review concentration risk and trim if needed.</p>
          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Largest weight</p>
            <p className="mt-2 text-2xl font-semibold">{tickers[0]?.ticker ?? "—"}</p>
            <p className="text-sm text-slate-200">{formatPct(tickers[0]?.weight ?? null, 1)}</p>
          </div>
        </div>
      </section>

      <PositionsList />
    </Shell>
  );
}
