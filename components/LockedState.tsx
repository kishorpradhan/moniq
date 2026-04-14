import Link from "next/link";

type LockedStateProps = {
  title?: string;
  message?: string;
};

export default function LockedState({
  title = "Private beta access",
  message = "Available in private beta. Request access to continue.",
}: LockedStateProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Locked</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{message}</p>
        </div>
        <div className="hidden text-4xl text-slate-200 sm:block">🔒</div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/request-access"
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Request access
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
        >
          Login
        </Link>
      </div>
    </section>
  );
}
