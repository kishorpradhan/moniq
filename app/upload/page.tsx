"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Shell from "@/components/Shell";
import RecentUploads from "@/components/RecentUploads";
import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/authFetch";

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const { token, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?next=/upload`);
    }
  }, [loading, user, router]);

  const onChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setStatus("Requesting upload link...");

    try {
      const presignResp = await authFetch("/api/uploads/presign", token, {
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
      const completeResp = await authFetch("/api/uploads/complete", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });

      if (!completeResp.ok) {
        throw new Error("Failed to finalize upload");
      }

      setStatus("Upload complete.");
    } catch (error) {
      setStatus("Upload failed. Try again.");
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

      </section>

      <RecentUploads />
    </Shell>
  );
}
