import Link from "next/link";

import Shell from "@/components/Shell";

const demoSections = [
  {
    href: "/demo/dashboard",
    title: "Dashboard",
    description: "Review sample portfolio value, allocation, sectors, and positions.",
  },
  {
    href: "/demo/chat",
    title: "Chat",
    description: "Ask natural language questions against the same sample portfolio.",
  },
  {
    href: "/demo/upload",
    title: "Sample data",
    description: "See how portfolio uploads work before connecting your own files.",
  },
];

export default function DemoPage() {
  return (
    <Shell>
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Public demo</p>
        <h1 className="mt-2 font-display text-3xl text-slate-900">Try Moniq with sample data.</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-500">
          Explore dashboard analytics and portfolio chat without signing in. The demo uses a
          read-only sample portfolio; upload and personal analysis require access.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {demoSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{section.description}</p>
          </Link>
        ))}
      </section>
    </Shell>
  );
}
