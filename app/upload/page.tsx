"use client";

import { useRef, useState } from "react";

import Shell from "@/components/Shell";

type UploadEntry = {
  id: number;
  name: string;
  date: string;
  rows?: number;
  status: "success" | "failed";
};

const initialUploads: UploadEntry[] = [
  { id: 1, name: "portfolio-march.csv", date: "2026-03-18", rows: 37, status: "success" },
  { id: 2, name: "my-holdings.csv", date: "2026-03-10", rows: 28, status: "success" },
  { id: 3, name: "initial-seed.csv", date: "2026-02-25", rows: 15, status: "success" },
];

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploads, setUploads] = useState<UploadEntry[]>(initialUploads);
  const [status, setStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const onChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setStatus("Requesting upload link...");

    try {
      const presignResp = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "text/csv" }),
      });

      if (!presignResp.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, filePath } = (await presignResp.json()) as {
        uploadUrl: string;
        filePath: string;
      };

      setStatus("Uploading to storage...");
      const putResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "text/csv" },
        body: file,
      });

      if (!putResp.ok) {
        throw new Error("Upload to storage failed");
      }

      setStatus("Finalizing upload...");
      const completeResp = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });

      if (!completeResp.ok) {
        throw new Error("Failed to finalize upload");
      }

      const today = new Date();
      const date = today.toISOString().slice(0, 10);
      setUploads((prev) => [
        {
          id: Date.now(),
          name: file.name,
          date,
          status: "success",
        },
        ...prev,
      ]);
      setStatus("Upload complete.");
    } catch (error) {
      setStatus("Upload failed. Try again.");
      setUploads((prev) => [
        {
          id: Date.now(),
          name: file.name,
          date: new Date().toISOString().slice(0, 10),
          status: "failed",
        },
        ...prev,
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Shell>
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Upload Data</h1>
        <p className="mt-2 text-slate-600">Add portfolio files for analysis and tracking.</p>
      </header>

      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <div className="text-lg font-semibold text-slate-800">Upload your portfolio CSV</div>
          <p className="mt-2 text-sm text-slate-500">CSV format: symbol,shares,price</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
              event.currentTarget.value = "";
            }}
          />
          <button
            className="mt-4 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            onClick={onChooseFile}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Choose a file"}
          </button>
          <p className="mt-2 text-xs text-slate-500">{status || "Ready to upload."}</p>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-slate-800">Recent Uploads</h2>
          <div className="mt-3 space-y-3">
            {uploads.map((upload) => (
              <div key={upload.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{upload.name}</span>
                  <span>{upload.date}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {upload.status === "success"
                    ? `${upload.rows ?? "Pending"} rows imported`
                    : "Upload failed"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}
