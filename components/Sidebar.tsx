"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/analysis", label: "Analysis" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen border-r border-slate-200 bg-white p-6">
      <div className="mb-10 text-2xl font-bold tracking-tight text-slate-900">Moniq</div>
      <nav className="space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const className = `block rounded-lg px-4 py-3 text-sm font-medium ${
            isActive ? "bg-slate-100 text-slate-900 shadow" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`;

          return (
            <Link key={link.href} href={link.href} className={className}>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
