import Shell from "@/components/Shell";

const prompts = [
  "What’s the optimal risk-return balance for this portfolio?",
  "Recommend three rebalance actions.",
  "Show potential tax implications for next quarter.",
];

const sampleResponse = "Your portfolio is positioned moderately aggressive. Consider reducing concentration in technology to 35% and increasing fixed income by 10%.";

export default function AnalysisPage() {
  return (
    <Shell>
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Analysis</h1>
        <p className="mt-2 text-slate-600">Generate insights with natural language prompts.</p>
      </header>

      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">Ask a question</label>
        <input
          type="text"
          placeholder="e.g., Which sector is overexposed?"
          className="mt-3 w-full rounded-lg border border-slate-200 p-3 focus:border-slate-400 focus:outline-none"
        />
        <button className="mt-4 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
          Analyze
        </button>
      </section>

      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Suggested prompts</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <span key={prompt} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              {prompt}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Sample response</h2>
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{sampleResponse}</p>
      </section>
    </Shell>
  );
}
