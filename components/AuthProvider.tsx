"use client";

import {
  GoogleAuthProvider,
  User,
  getAuth,
  onIdTokenChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getFirebaseApp } from "@/lib/firebaseClient";
import { authFetch } from "@/lib/authFetch";

export type ProfileType = "portfolio" | "watchlist" | "kid";

export type Profile = {
  id: string;
  userId: string;
  displayName: string;
  profileType: ProfileType;
  isDefault: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DemoSession = {
  id: string;
  demoUserId: string;
  llmCallCount: number;
  llmCallLimit: number;
  expiresAt?: string | null;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  userId: string | null;
  profiles: Profile[];
  selectedProfile: Profile | null;
  setSelectedProfile: (profile: Profile) => void;
  refreshProfiles: (preferredProfileId?: string) => Promise<void>;
  loading: boolean;
  isDemo: boolean;
  demoSession: DemoSession | null;
  startDemo: () => Promise<void>;
  exitDemo: () => void;
  updateDemoSession: (session: DemoSession) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const PROFILE_STORAGE_KEY = "moniq_selected_profile_id";
const DEMO_PROFILE_STORAGE_KEY = "moniq_demo_selected_profile_id";
const DEMO_SESSION_STORAGE_KEY = "moniq_demo_session";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function chooseInitialProfile(profiles: Profile[], storageKey: string) {
  if (typeof window !== "undefined") {
    const storedId = window.localStorage.getItem(storageKey);
    const storedProfile = profiles.find((profile) => profile.id === storedId);
    if (storedProfile) return storedProfile;
  }
  return profiles.find((profile) => profile.isDefault) ?? profiles[0] ?? null;
}

function loadStoredDemoSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as DemoSession;
    if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    return null;
  }
}

function storeDemoSession(session: DemoSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfileState] = useState<Profile | null>(null);
  const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
  const [loading, setLoading] = useState(true);

  const isDemo = Boolean(demoSession) && !user;

  const setSelectedProfile = useCallback(
    (profile: Profile) => {
      setSelectedProfileState(profile);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(isDemo ? DEMO_PROFILE_STORAGE_KEY : PROFILE_STORAGE_KEY, profile.id);
      }
    },
    [isDemo]
  );

  const loadDemoProfiles = useCallback(async (session: DemoSession, preferredProfileId?: string) => {
    const profilesRes = await fetch("/api/profiles", {
      headers: { "X-Moniq-Demo-Session": session.id },
    });
    if (!profilesRes.ok) {
      const detail = await profilesRes.text().catch(() => "");
      throw new Error(detail || "Unable to load demo profiles.");
    }
    const data = (await profilesRes.json()) as { profiles?: Profile[] };
    const loadedProfiles = data.profiles ?? [];
    setProfiles(loadedProfiles);
    const preferred = preferredProfileId
      ? loadedProfiles.find((profile) => profile.id === preferredProfileId)
      : null;
    const nextProfile = preferred ?? chooseInitialProfile(loadedProfiles, DEMO_PROFILE_STORAGE_KEY);
    setSelectedProfileState(nextProfile);
    if (nextProfile && typeof window !== "undefined") {
      window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEY, nextProfile.id);
    }
  }, []);

  const refreshProfiles = useCallback(
    async (preferredProfileId?: string) => {
      if (demoSession && !user) {
        await loadDemoProfiles(demoSession, preferredProfileId);
        return;
      }
      if (!token) return;
      const profilesRes = await authFetch("/api/profiles", token);
      if (!profilesRes.ok) return;
      const data = (await profilesRes.json()) as { profiles?: Profile[] };
      const loadedProfiles = data.profiles ?? [];
      setProfiles(loadedProfiles);
      const preferred = preferredProfileId
        ? loadedProfiles.find((profile) => profile.id === preferredProfileId)
        : null;
      const nextProfile = preferred ?? chooseInitialProfile(loadedProfiles, PROFILE_STORAGE_KEY);
      setSelectedProfileState(nextProfile);
      if (nextProfile && typeof window !== "undefined") {
        window.localStorage.setItem(PROFILE_STORAGE_KEY, nextProfile.id);
      }
    },
    [demoSession, loadDemoProfiles, token, user]
  );

  const updateDemoSession = useCallback((session: DemoSession) => {
    setDemoSession(session);
    storeDemoSession(session);
  }, []);

  const startDemo = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/demo/session", { method: "POST" });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(detail || "Unable to start demo.");
      }
      const payload = (await response.json()) as { session: DemoSession };
      setUser(null);
      setToken(null);
      setUserId(payload.session.demoUserId);
      updateDemoSession(payload.session);
      await loadDemoProfiles(payload.session);
    } finally {
      setLoading(false);
    }
  }, [loadDemoProfiles, updateDemoSession]);

  const exitDemo = useCallback(() => {
    setDemoSession(null);
    setProfiles([]);
    setSelectedProfileState(null);
    setUserId(null);
    storeDemoSession(null);
    fetch("/api/demo/session", { method: "DELETE" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    return onIdTokenChanged(auth, async (nextUser) => {
      setLoading(true);
      setUser(nextUser);
      setProfiles([]);
      setSelectedProfileState(null);
      if (nextUser) {
        setDemoSession(null);
        storeDemoSession(null);
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

        try {
          const profilesRes = await authFetch("/api/profiles", idToken);
          if (profilesRes.ok) {
            const data = (await profilesRes.json()) as { profiles?: Profile[] };
            const loadedProfiles = data.profiles ?? [];
            setProfiles(loadedProfiles);
            setSelectedProfileState(chooseInitialProfile(loadedProfiles, PROFILE_STORAGE_KEY));
          }
        } catch {
          setProfiles([]);
          setSelectedProfileState(null);
        }
      } else {
        setToken(null);
        const storedDemo = loadStoredDemoSession();
        if (storedDemo) {
          setDemoSession(storedDemo);
          setUserId(storedDemo.demoUserId);
          await loadDemoProfiles(storedDemo);
        } else {
          setDemoSession(null);
          setUserId(null);
          setProfiles([]);
          setSelectedProfileState(null);
        }
      }
      setLoading(false);
    });
  }, [loadDemoProfiles]);

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
    () => ({
      user,
      token,
      userId,
      profiles,
      selectedProfile,
      setSelectedProfile,
      refreshProfiles,
      loading,
      isDemo,
      demoSession,
      startDemo,
      exitDemo,
      updateDemoSession,
      signInWithGoogle,
      signOut,
    }),
    [
      user,
      token,
      userId,
      profiles,
      selectedProfile,
      setSelectedProfile,
      refreshProfiles,
      loading,
      isDemo,
      demoSession,
      startDemo,
      exitDemo,
      updateDemoSession,
    ]
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
