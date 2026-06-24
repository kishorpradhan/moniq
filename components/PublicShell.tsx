import Link from "next/link";
import { ReactNode } from "react";

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f7f4] px-4 py-4 text-slate-950">
      <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5 lg:px-10">
          <Link href="/" className="text-2xl font-bold tracking-tight text-slate-950">
            Moniq
          </Link>
          <nav className="flex items-center gap-5 text-sm font-semibold text-slate-700 sm:text-base">
            <Link href="/" className="hover:text-slate-950">
              Home
            </Link>
            <Link href="/about" className="hover:text-slate-950">
              About
            </Link>
            <Link href="/login" className="hover:text-slate-950">
              Log in
            </Link>
            <Link
              href="/demo"
              className="rounded-xl bg-slate-950 px-4 py-3 text-white hover:bg-slate-800"
            >
              Try demo
            </Link>
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
