"use client";

import {
  GoogleAuthProvider,
  User,
  getAuth,
  onIdTokenChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getFirebaseApp } from "@/lib/firebaseClient";
import { authFetch } from "@/lib/authFetch";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  userId: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    return onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const idToken = await nextUser.getIdToken();
        setToken(idToken);
        try {
          const res = await authFetch("/api/auth/me", idToken);
          if (res.ok) {
            const data = (await res.json()) as { userId?: string };
            setUserId(data.userId ?? null);
          } else {
            setUserId(null);
          }
        } catch {
          setUserId(null);
        }
      } else {
        setToken(null);
        setUserId(null);
      }
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = async () => {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    await firebaseSignOut(auth);
  };

  const value = useMemo(
    () => ({ user, token, userId, loading, signInWithGoogle, signOut }),
    [user, token, userId, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
