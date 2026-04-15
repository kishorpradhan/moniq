import Link from "next/link";
import Shell from "@/components/Shell";
import ScreenshotPreviewCard from "@/components/ScreenshotPreviewCard";

export default function HomePage() {
  return (
    <Shell>
      <section className="rounded-3xl bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <h1 className="text-4xl font-bold text-slate-900">Understand your US &amp; India investments instantly.</h1>
            <p className="text-lg text-slate-600">
              Moniq lets you analyze your portfolio using natural language.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/request-access"
                className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Request Beta Access
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                Login
              </Link>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
              Built for investors managing US and India portfolios.
            </p>
          </div>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Private Beta</div>
            <p className="mt-3 text-base font-semibold text-slate-900">Built for global investors.</p>
            <p className="mt-2 text-sm text-slate-500">
              Moniq is currently invite-only while we work closely with early users to improve the experience.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">See Moniq in action</h2>
            <p className="text-sm text-slate-500">A quick look at the core workflow.</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <ScreenshotPreviewCard
            title="Upload Portfolio"
            caption="Upload a portfolio using CSV or manual entry."
            placeholderLabel="Upload"
            imageSrc="/previews/Upload.png"
            imageAlt="Upload portfolio preview"
          />
          <ScreenshotPreviewCard
            title="Ask Questions"
            caption="Ask questions about your investments in plain English."
            placeholderLabel="Questions"
            imageSrc="/previews/Chat.png"
            imageAlt="Ask questions preview"
          />
          <ScreenshotPreviewCard
            title="Portfolio Dashboard"
            caption="View portfolio performance, allocation, and trends in one place."
            placeholderLabel="Dashboard"
            imageSrc="/previews/Dashboard.png"
            imageAlt="Portfolio dashboard preview"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Request access</h2>
            <p className="mt-2 text-sm text-slate-500">
              Moniq is currently available in private beta.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/request-access"
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Request Beta Access
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
