"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

const links = [
  { href: "/", label: "Home", public: true },
  { href: "/dashboard", label: "Dashboard", public: false },
  { href: "/upload", label: "Upload", public: false },
  { href: "/analysis", label: "Analysis", public: false },
  { href: "/chat", label: "Chat", public: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const isAuthed = Boolean(user);

  return (
    <aside className="w-64 min-h-screen border-r border-slate-200 bg-white p-6">
      <div className="mb-8 text-2xl font-bold tracking-tight text-slate-900">Moniq</div>

      {!loading && isAuthed ? (
        <div className="mb-8 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-600">Signed in</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{user?.email}</div>
        </div>
      ) : null}

      <nav className="space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const locked = !link.public && !isAuthed;
          const className = `flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium ${
            isActive
              ? "bg-slate-100 text-slate-900 shadow"
              : locked
              ? "text-slate-400 hover:bg-slate-50"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`;

          if (locked) {
            return (
              <button
                key={link.href}
                type="button"
                className={className}
                onClick={() => router.push(`/login?next=${encodeURIComponent(link.href)}`)}
              >
                <span>{link.label}</span>
                <span className="text-xs">🔒</span>
              </button>
            );
          }

          return (
            <Link key={link.href} href={link.href} className={className}>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 space-y-2">
        {!isAuthed ? (
          <>
            <button
              className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white"
              type="button"
              onClick={() => router.push("/login")}
            >
              Get started
            </button>
            <button
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              type="button"
              onClick={() => router.push("/login")}
            >
              Sign in
            </button>
          </>
        ) : (
          <button
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
            type="button"
            onClick={() => signOut().then(() => router.push("/"))}
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
