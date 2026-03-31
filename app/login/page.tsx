"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/authFetch";

type MeResponse = {
  userId: string;
  email: string;
};

function LoginView({
  onSignIn,
  loading,
  checking,
  error,
}: {
  onSignIn?: () => void;
  loading: boolean;
  checking: boolean;
  error: string | null;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <div className="w-full rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="grid gap-10 p-10 md:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Moniq</p>
                <h1 className="mt-3 font-display text-4xl text-slate-900">Smarter money, clearer picture.</h1>
                <p className="mt-3 max-w-md text-sm text-slate-500">
                  Upload your portfolio and get insights that actually make sense. Built for real people, not spreadsheets.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Portfolio tracking", "Risk analysis", "Smart insights", "CSV import"].map((pill) => (
                  <span key={pill} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-lg font-semibold text-slate-900">Welcome back</div>
              <p className="mt-1 text-sm text-slate-500">Sign in with Google to continue.</p>

              <button
                className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
                onClick={onSignIn}
                type="button"
                disabled={loading || checking}
              >
                Continue with Google
              </button>

              {checking ? (
                <p className="mt-4 text-xs text-slate-500">Checking beta access…</p>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </div>
              ) : null}

              <p className="mt-4 text-xs text-slate-400">
                By signing in, you agree to join the Moniq beta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const { user, token, signInWithGoogle, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!token || !user) return;
    let active = true;
    setChecking(true);
    authFetch("/api/auth/me", token)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || "Beta access required");
        }
        return res.json() as Promise<MeResponse>;
      })
      .then(() => {
        if (active) router.push(nextPath);
      })
      .catch(() => {
        if (active) setError("Your account is not on the beta allowlist yet.");
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [token, user, nextPath, router]);

  return (
    <LoginView
      onSignIn={() => signInWithGoogle().catch(() => setError("Google sign-in failed."))}
      loading={loading}
      checking={checking}
      error={error}
    />
  );
}

function LoginFallback() {
  return <LoginView loading={true} checking={false} error={null} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
