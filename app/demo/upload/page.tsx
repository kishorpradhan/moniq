import Link from "next/link";

import Shell from "@/components/Shell";

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

export default function DemoUploadPage() {
  return (
    <Shell>
      <header className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sample data</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Demo upload workflow</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          The public demo uses preloaded sample files. Sign in to upload your own portfolio CSVs
          and generate personal analytics.
        </p>
      </header>

      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="text-lg font-semibold text-slate-800">Uploads are disabled in demo mode</div>
          <p className="mt-2 text-sm text-slate-500">
            This keeps the public demo read-only and avoids temporary file cleanup.
          </p>
          <Link
            href="/request-access"
            className="mt-5 inline-flex rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Request access to upload
          </Link>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Preloaded demo files</h2>
        <div className="mt-5 space-y-3">
          {sampleFiles.map((file) => (
            <div
              key={file.name}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-5 py-4"
            >
              <div>
                <div className="font-semibold text-slate-900">{file.name}</div>
                <div className="text-sm text-slate-500">
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
    </Shell>
  );
}
