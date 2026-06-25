"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

export default function DemoPage() {
  const router = useRouter();
  const { startDemo } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let active = true;
    if (!startPromiseRef.current) {
      startPromiseRef.current = startDemo();
    }
    startPromiseRef.current
      .then(() => {
        if (active) router.replace("/dashboard");
      })
      .catch((err: Error) => {
        startPromiseRef.current = null;
        if (active) setError(err.message || "Unable to start demo.");
      });
    return () => {
      active = false;
    };
  }, [router, startDemo]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-slate-900">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Moniq demo</p>
        <h1 className="mt-2 text-2xl font-semibold">Starting demo</h1>
        <p className="mt-2 text-sm text-slate-500">
          Loading read-only profiles and sample portfolio data.
        </p>
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </section>
    </main>
  );
}
