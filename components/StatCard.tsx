interface StatCardProps {
  title: string;
  value: string;
  delta?: string;
  description?: string;
}

export default function StatCard({ title, value, delta, description }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>
      <div className="mt-2 flex items-start gap-2">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {delta ? <div className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{delta}</div> : null}
      </div>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}
