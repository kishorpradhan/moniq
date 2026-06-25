"use client";

import { useEffect, useRef, useState } from "react";
import ProfileSelector from "@/components/ProfileSelector";
import Shell from "@/components/Shell";
import RecentUploads from "@/components/RecentUploads";
import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/authFetch";
import LockedState from "@/components/LockedState";

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const { token, user, loading, selectedProfile, isDemo } = useAuth();

  const onChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setStatus("Requesting upload link...");

    try {
      const presignResp = await authFetch("/api/uploads/presign", token, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(selectedProfile ? { "X-Moniq-Profile-Id": selectedProfile.id } : {}),
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "text/csv",
          profileId: selectedProfile?.id,
        }),
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
        headers: {
          "Content-Type": "application/json",
          ...(selectedProfile ? { "X-Moniq-Profile-Id": selectedProfile.id } : {}),
        },
        body: JSON.stringify({ filePath, profileId: selectedProfile?.id }),
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

  if (loading) {
    return (
      <Shell>
        <section className="rounded-lg bg-white p-8 text-sm text-slate-500 shadow-sm">Loading uploads…</section>
      </Shell>
    );
  }

  if (isDemo) {
    return (
      <Shell>
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Demo mode</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Uploads are disabled in the demo</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            The demo uses preloaded profile data so you can explore the same dashboard and chat experience without signing in.
          </p>
        </section>
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

  return (
    <Shell>
      <header className="rounded-lg bg-white p-8 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Upload</p>
          <h1 className="text-3xl font-bold text-slate-900">Upload data</h1>
          <p className="mt-2 text-slate-600">
            Add portfolio files for {selectedProfile?.displayName ?? "the selected profile"}.
          </p>
        </div>
        <div className="mt-6">
          <ProfileSelector />
        </div>
      </header>

      <section className="rounded-lg bg-white p-8 shadow-sm">
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
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
