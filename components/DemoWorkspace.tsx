"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import ChatExperience from "@/components/ChatExperience";
import DashboardExperience from "@/components/DashboardExperience";
import { demoAllocation, demoPositions, demoSummary } from "@/lib/demoData";

type DemoTab = "overview" | "chat" | "data";

const tabs: Array<{ id: DemoTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "chat", label: "Chat" },
  { id: "data", label: "Sample data" },
];

const sampleFiles = [
  {
    name: "sample-us-brokerage.csv",
    rows: 18,
    status: "Processed",
    description: "US equities and ETF transactions",
  },
  {
    name: "sample-india-brokerage.csv",
    rows: 11,
    status: "Processed",
    description: "India equity transactions",
  },
];

export default function DemoWorkspace({ initialTab = "overview" }: { initialTab?: DemoTab }) {
  const validInitialTab = useMemo(
    () => (tabs.some((tab) => tab.id === initialTab) ? initialTab : "overview"),
    [initialTab]
  );
  const [activeTab, setActiveTab] = useState<DemoTab>(validInitialTab);

  return (
    <div className="px-6 py-10 lg:px-12">
      <section className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">
            Public demo
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            Try Moniq with sample data.
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-stone-600">
            No sign-up required. Explore a read-only sample portfolio, ask questions,
            and see the analytics flow.
          </p>
        </div>
        <Link
          href="/request-access"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Request access
        </Link>
      </section>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              activeTab === tab.id
                ? "border-slate-950 text-slate-950"
                : "border-transparent text-stone-500 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === "overview" ? (
          <DashboardExperience
            summary={demoSummary}
            allocation={demoAllocation}
            positions={demoPositions}
            mode="demo"
          />
        ) : null}

        {activeTab === "chat" ? <ChatExperience mode="demo" embedded /> : null}

        {activeTab === "data" ? (
          <section className="space-y-5 rounded-3xl bg-white p-8 shadow-sm">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Sample data</h2>
              <p className="mt-2 max-w-2xl text-sm text-stone-500">
                These files are preloaded for the public demo. Upload your own portfolio
                after requesting access.
              </p>
            </div>
            <div className="space-y-3">
              {sampleFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-5 py-4"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{file.name}</div>
                    <div className="text-sm text-stone-500">
                      {file.description} - {file.rows} rows
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {file.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
