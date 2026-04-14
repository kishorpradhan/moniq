"use client";

import { useState } from "react";
import Link from "next/link";

import Shell from "@/components/Shell";

export default function RequestAccessPage() {
  const [gmail, setGmail] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gmail.trim()) return;
    const subject = "Moniq Beta Access Request";
    const body = `Gmail: ${gmail.trim()}\n\nNotes:`;
    const href = `mailto:kishor.pradhan@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  return (
    <Shell>
      <section className="rounded-3xl bg-white p-10 shadow-sm">
        <div className="max-w-2xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Request access</p>
          <h1 className="text-3xl font-bold text-slate-900">Join the Moniq private beta.</h1>
          <p className="text-base text-slate-600">
            Moniq is currently invitation-only while we validate the product and protect the underlying data services.
          </p>
          <p className="text-base text-slate-600">
            Enter your Gmail ID and we will follow up as capacity opens.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="gmail">
              Gmail ID
            </label>
            <input
              id="gmail"
              type="email"
              placeholder="you@gmail.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
              value={gmail}
              onChange={(event) => setGmail(event.target.value)}
              required
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Request Beta Access
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            Request access is manual for now. We are keeping the beta small to ensure safe, high-quality insights.
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
            >
              Login
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}
