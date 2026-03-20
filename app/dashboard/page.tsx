import Shell from "@/components/Shell";
import StatCard from "@/components/StatCard";

const mockPositions = [
  { symbol: "AAPL", qty: 24, value: 3780, change: 0.87 },
  { symbol: "MSFT", qty: 18, value: 5600, change: 1.92 },
  { symbol: "GOOG", qty: 6, value: 4500, change: -0.35 },
];

const allocation = [
  { label: "Equities", value: 65, color: "bg-emerald-400" },
  { label: "Fixed Income", value: 25, color: "bg-sky-400" },
  { label: "Cash", value: 10, color: "bg-orange-300" },
];

export default function DashboardPage() {
  return (
    <Shell>
      <header className="space-y-2 rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Your Moniq portfolio summary—clean and focused.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Value" value="$13,880" delta="+3.2%" description="Since last week" />
        <StatCard title="Day Change" value="+$212" delta="+1.56%" description="Today’s performance" />
        <StatCard title="Positions" value={`${mockPositions.length}`} description="Tracked holdings" />
        <StatCard title="Risk Score" value="Moderate" description="Based on current allocation" />
      </section>

      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Portfolio Allocation</h2>
        <div className="mt-4 space-y-3">
          {allocation.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{item.label}</span>
                <span>{item.value}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Holdings</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2">Symbol</th>
                <th className="px-4 py-2">Qty</th>
                <th className="px-4 py-2">Value</th>
                <th className="px-4 py-2">Change</th>
              </tr>
            </thead>
            <tbody>
              {mockPositions.map((pos) => (
                <tr key={pos.symbol} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">{pos.symbol}</td>
                  <td className="px-4 py-2">{pos.qty}</td>
                  <td className="px-4 py-2">${pos.value.toLocaleString()}</td>
                  <td className={`px-4 py-2 font-semibold ${pos.change > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {pos.change > 0 ? "+" : ""}{pos.change}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Ask Your Portfolio</h2>
        <p className="mt-1 text-sm text-slate-500">Try questions like “What should I rebalance this month?”</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input type="text" placeholder="Type your question..." className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 focus:border-slate-400 focus:outline-none" />
          <button className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Ask</button>
        </div>
      </section>
    </Shell>
  );
}
