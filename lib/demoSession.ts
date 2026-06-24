"use client";

const DEMO_SESSION_STORAGE_KEY = "moniq_demo_session_id";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `demo_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function getDemoSessionId() {
  if (typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
  if (existing) return existing;

  const next = createSessionId();
  window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, next);
  return next;
}
