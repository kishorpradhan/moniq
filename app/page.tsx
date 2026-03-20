import Shell from "@/components/Shell";

export default function HomePage() {
  return (
    <Shell>
      <section className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <h1 className="text-4xl font-bold text-slate-900">Moniq</h1>
        <p className="mt-4 text-lg text-slate-700">Smarter personal finance insights are on the way.</p>
        <div className="mt-8 inline-flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <span className="text-3xl font-semibold text-slate-800">Coming Soon</span>
          <p className="mt-2 max-w-md text-sm text-slate-600">Build, upload, and analyze portfolios with clarity and confidence.</p>
        </div>
      </section>
    </Shell>
  );
}
