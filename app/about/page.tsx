import Link from "next/link";

import Shell from "@/components/Shell";

export default function AboutPage() {
  return (
    <Shell>
      <section className="rounded-3xl bg-white p-10 shadow-sm">
        <div className="max-w-3xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">About Moniq</p>
          <h1 className="text-3xl font-bold text-slate-900">About Moniq</h1>
          <p className="text-base text-slate-600">
            Moniq helps investors understand their US and India portfolios using simple, natural language.
          </p>
          <p className="text-base text-slate-600">
            Many global investors manage holdings across multiple brokers, accounts, and markets. Moniq brings everything together in one place — combining portfolio data, visualizations, and AI-powered insights so you can understand your investments instantly.
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">What you can do with Moniq</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Upload portfolios from US and India brokers</li>
              <li>Visualize performance and portfolio allocation</li>
              <li>Ask questions about your portfolio in plain English</li>
              <li>Compare your portfolio with relevant benchmarks</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            Moniq is currently available in private beta, and access is provided by invitation as we work closely with early users.
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-semibold text-amber-900">Disclaimer</p>
            <p className="mt-2">
              Moniq provides portfolio analytics and informational insights only. Moniq is not a financial advisor and does not provide financial, investment, tax, or legal advice. Information presented by the platform is for informational purposes only and should not be relied upon as a recommendation to buy, sell, or hold any security. Users should conduct their own research and consult qualified professionals before making financial decisions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/request-access"
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Request access
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}
