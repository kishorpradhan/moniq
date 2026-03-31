"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/authFetch";

type OpenRow = {
  ticker: string;
  quantity: number;
  marketValue: number;
  costBasis: number;
  unrealizedPl: number;
  returnPct: number | null;
  dividendsReceived: number;
  xirr: number | null;
  contributionPct: number | null;
  asOfDate: string;
};

type ClosedRow = {
  ticker: string;
  closedQuantity: number;
  realizedCostBasis: number;
  realizedProceeds: number;
  realizedPl: number;
  returnPct: number | null;
  asOfDate: string;
};

type PositionsResponse = {
  open: OpenRow[];
  closed: ClosedRow[];
};

function formatMoney(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatPct(value: number | null, digits = 1) {
  if (value === null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export default function PositionsList() {
  const [data, setData] = useState<PositionsResponse | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { token } = useAuth();

  useEffect(() => {
    let active = true;
    if (!token) return;
    authFetch("/api/portfolio/positions", token)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Request failed");
        }
        return res.json();
      })
      .then((payload: PositionsResponse) => {
        if (active) {
          setData(payload);
        }
      })
      .catch(() => {
        if (active) {
          setData({ open: [], closed: [] });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const merged = useMemo(() => {
    if (!data) return [] as Array<{ ticker: string; open?: OpenRow; closed?: ClosedRow }>;
    const map = new Map<string, { ticker: string; open?: OpenRow; closed?: ClosedRow }>();
    data.open.forEach((row) => {
      map.set(row.ticker, { ticker: row.ticker, open: row });
    });
    data.closed.forEach((row) => {
      const existing = map.get(row.ticker) ?? { ticker: row.ticker };
      map.set(row.ticker, { ...existing, closed: row });
    });
    return Array.from(map.values());
  }, [data]);

  if (!data) {
    return (
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="text-sm text-slate-500">Loading positions...</div>
      </section>
    );
  }

  if (merged.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="text-sm text-slate-500">No positions available yet.</div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {merged.map((item) => {
        const open = item.open;
        const closed = item.closed;
        const isOpen = expanded[item.ticker] ?? false;
        const weight = open?.contributionPct ?? null;
        const derivedPrice = open && open.quantity > 0 ? open.marketValue / open.quantity : null;

        return (
          <div key={item.ticker} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <button
              className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
              onClick={() => setExpanded((prev) => ({ ...prev, [item.ticker]: !isOpen }))}
              type="button"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                  {item.ticker.slice(0, 4)}
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900">{item.ticker}</div>
                  <div className="text-sm text-slate-500">Open + Closed summary</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-6 text-sm text-slate-600">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Price</div>
                  <div className="font-semibold text-slate-900">
                    {derivedPrice ? formatMoney(derivedPrice) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Mkt value</div>
                  <div className="font-semibold text-slate-900">{open ? formatMoney(open.marketValue) : "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Return</div>
                  <div className={`font-semibold ${open && open.unrealizedPl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {open ? formatPct(open.returnPct, 1) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Weight</div>
                  <div className="font-semibold text-slate-900">{formatPct(weight, 1)}</div>
                </div>
              </div>
            </button>

            {isOpen ? (
              <div className="border-t border-slate-100 px-6 pb-6">
                <div className="grid gap-6 pt-6 lg:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Open positions
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-400">Shares</div>
                        <div className="font-semibold text-slate-900">{open ? open.quantity : 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Avg cost</div>
                        <div className="font-semibold text-slate-900">
                          {open && open.quantity > 0 ? formatMoney(open.costBasis / open.quantity) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Unrealized P/L</div>
                        <div className={`font-semibold ${open && open.unrealizedPl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {open ? formatMoney(open.unrealizedPl) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Dividends</div>
                        <div className="font-semibold text-slate-900">{open ? formatMoney(open.dividendsReceived) : "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">XIRR</div>
                        <div className="font-semibold text-slate-900">{open ? formatPct(open.xirr, 2) : "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">As of</div>
                        <div className="font-semibold text-slate-900">{open?.asOfDate ?? "—"}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-slate-400" /> Closed positions
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-400">Shares closed</div>
                        <div className="font-semibold text-slate-900">{closed ? closed.closedQuantity : 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Realized P/L</div>
                        <div className={`font-semibold ${closed && closed.realizedPl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {closed ? formatMoney(closed.realizedPl) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Return</div>
                        <div className="font-semibold text-slate-900">{closed ? formatPct(closed.returnPct, 1) : "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">As of</div>
                        <div className="font-semibold text-slate-900">{closed?.asOfDate ?? "—"}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-slate-400">Proceeds vs cost</div>
                        <div className="font-semibold text-slate-900">
                          {closed ? `${formatMoney(closed.realizedProceeds)} / ${formatMoney(closed.realizedCostBasis)}` : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
