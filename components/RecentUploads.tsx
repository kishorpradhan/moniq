"use client";

import { useEffect, useMemo, useState } from "react";

export type UploadRun = {
  id: number;
  bucket: string;
  objectName: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  rowCount: number | null;
  insertedCount: number | null;
  skippedCount: number | null;
  error: unknown;
  formatMismatch?: boolean;
};

type UploadsResponse = {
  uploads: UploadRun[];
};

function formatStatus(status: string) {
  switch (status) {
    case "started":
      return { label: "Processing", tone: "bg-amber-100 text-amber-700" };
    case "success":
      return { label: "Imported", tone: "bg-emerald-100 text-emerald-700" };
    case "partial":
      return { label: "Partial", tone: "bg-amber-100 text-amber-700" };
    case "failed":
      return { label: "Failed", tone: "bg-rose-100 text-rose-700" };
    default:
      return { label: status, tone: "bg-slate-100 text-slate-600" };
  }
}

function displayName(path: string) {
  const parts = path.split("/");
  const file = parts[parts.length - 1] ?? path;
  const dashIndex = file.indexOf("-");
  if (dashIndex > 0) {
    return file.slice(dashIndex + 1);
  }
  return file;
}

function formatClientTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function RecentUploads() {
  const [data, setData] = useState<UploadRun[]>([]);
  const [polling, setPolling] = useState(false);

  const hasPending = useMemo(
    () => data.some((run) => run.status === "started"),
    [data]
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/uploads/recent?limit=10");
        const payload = (await res.json()) as UploadsResponse;
        if (active) {
          setData(payload.uploads ?? []);
        }
      } catch (err) {
        if (active) {
          setData([]);
        }
      }
    }

    void load();
    setPolling(true);
    const timer = setInterval(load, 7000);
    return () => {
      active = false;
      clearInterval(timer);
      setPolling(false);
    };
  }, []);

  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Recent uploads</h2>
          <p className="text-sm text-slate-500">Latest ingestion runs from your uploads.</p>
        </div>
        {polling && hasPending ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Updating…
          </span>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        {data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No upload history yet.
          </div>
        ) : (
          data.map((run) => {
            const status = formatStatus(run.status);
            return (
              <div key={run.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{displayName(run.objectName)}</div>
                    <div className="text-xs text-slate-500">{formatClientTime(run.startedAt)}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-4 text-sm text-slate-600">
                  <div>
                    <div className="text-xs text-slate-400">Parsed</div>
                    <div className="font-semibold text-slate-800">{run.rowCount ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Inserted</div>
                    <div className="font-semibold text-slate-800">{run.insertedCount ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Skipped</div>
                    <div className="font-semibold text-slate-800">{run.skippedCount ?? 0}</div>
                  </div>
                </div>

                {run.formatMismatch ? (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                    Uploaded, but no rows were imported. Check the CSV format and required headers.
                  </div>
                ) : null}

                {run.status === "failed" && run.error ? (
                  <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                    {typeof run.error === "string" ? run.error : JSON.stringify(run.error)}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
