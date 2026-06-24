import Link from "next/link";

import PublicShell from "@/components/PublicShell";

const steps = [
  {
    number: "1",
    title: "Upload",
    description: "CSV or manual entry.",
    icon: "up",
  },
  {
    number: "2",
    title: "Ask",
    description: "Questions in plain English.",
    icon: "chat",
  },
  {
    number: "3",
    title: "See",
    description: "Performance and allocation.",
    icon: "chart",
  },
];

function StepIcon({ icon }: { icon: string }) {
  if (icon === "chat") {
    return (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 6h14v9H8l-3 3V6Z" />
        <path d="M8 9h8M8 12h5" />
      </svg>
    );
  }

  if (icon === "chart") {
    return (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19V9h4v10M10 19V5h4v14M16 19v-8h4v8" />
      </svg>
    );
  }

  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 16v3h14v-3" />
    </svg>
  );
}

function DemoPreview() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-[#f5f4ee] p-7">
      <p className="text-xl font-semibold text-stone-500">Live demo preview</p>
      <div className="mt-5 space-y-3">
        <div className="h-3 w-4/5 rounded-full bg-stone-300" />
        <div className="h-3 w-2/3 rounded-full bg-stone-300" />
        <div className="h-3 w-1/2 rounded-full bg-stone-300" />
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <div className="h-16 rounded-lg bg-white" />
        <div className="h-16 rounded-lg bg-white" />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <PublicShell>
      <section className="grid gap-12 px-6 py-16 lg:grid-cols-[1.25fr_0.95fr] lg:px-12 lg:py-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">
            Private beta
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-tight tracking-tight text-slate-950 lg:text-6xl">
            Understand your US &amp; India investments instantly.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-stone-600">
            Analyze a sample portfolio before connecting your own data.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/demo"
              className="rounded-xl bg-slate-950 px-7 py-4 text-lg font-semibold text-white hover:bg-slate-800"
            >
              Try the demo -&gt;
            </Link>
            <Link
              href="/request-access"
              className="rounded-xl border border-slate-300 px-7 py-4 text-lg font-semibold text-stone-700 hover:border-slate-500"
            >
              Request beta access
            </Link>
          </div>
          <p className="mt-5 text-lg font-semibold text-stone-500">
            No sign-up needed to explore the demo.
          </p>
        </div>

        <div className="self-center">
          <DemoPreview />
        </div>
      </section>

      <section className="px-6 pb-12 lg:px-12">
        <h2 className="text-2xl font-semibold text-stone-800">How it works</h2>
        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="rounded-2xl border border-slate-200 p-7">
              <div className="text-stone-700">
                <StepIcon icon={step.icon} />
              </div>
              <h3 className="mt-6 text-2xl font-bold text-slate-950">
                {step.number} - {step.title}
              </h3>
              <p className="mt-2 text-xl text-stone-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
