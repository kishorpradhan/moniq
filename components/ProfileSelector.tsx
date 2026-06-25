"use client";

import { useState } from "react";

import { Profile, ProfileType, useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/authFetch";

function profileTypeLabel(type: Profile["profileType"]) {
  if (type === "kid") return "Kid";
  if (type === "watchlist") return "Watchlist";
  return "Portfolio";
}

const profileTypes: Array<{ value: ProfileType; label: string }> = [
  { value: "portfolio", label: "Portfolio" },
  { value: "watchlist", label: "Watchlist" },
  { value: "kid", label: "Kid" },
];

export default function ProfileSelector() {
  const { token, profiles, selectedProfile, setSelectedProfile, refreshProfiles, isDemo } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileType, setProfileType] = useState<ProfileType>("portfolio");
  const [error, setError] = useState<string | null>(null);

  const createProfile = async () => {
    if (isDemo || !token || !displayName.trim()) return;
    setError(null);
    try {
      const response = await authFetch("/api/profiles", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          profileType,
          isDefault: false,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Unable to create profile.");
      }
      const payload = (await response.json()) as { profile: Profile };
      await refreshProfiles(payload.profile.id);
      setDisplayName("");
      setProfileType("portfolio");
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create profile.");
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex items-end gap-2 overflow-x-auto border-b border-slate-200 pb-1">
        {profiles.length === 0 ? (
          <button
            type="button"
            className="shrink-0 border-b-2 border-slate-900 px-3 py-2 text-left text-sm font-semibold text-slate-900"
          >
            My Portfolio
          </button>
        ) : null}

        {profiles.map((profile) => {
          const isSelected = selectedProfile?.id === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              className={`shrink-0 border-b-2 px-3 py-2 text-left text-sm transition ${
                isSelected
                  ? "border-slate-900 text-slate-950"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}
              onClick={() => setSelectedProfile(profile)}
            >
              <span className="block max-w-40 truncate font-semibold">{profile.displayName}</span>
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {profileTypeLabel(profile.profileType)}
              </span>
            </button>
          );
        })}

        {!isDemo ? (
          <button
            type="button"
            className={`ml-1 shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition ${
              isCreating
                ? "border-slate-900 text-slate-950"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
            }`}
            onClick={() => {
              setIsCreating((value) => !value);
              setError(null);
            }}
            aria-label={isCreating ? "Close profile form" : "Create profile"}
          >
            {isCreating ? "Close" : "+"}
          </button>
        ) : null}
      </div>

      {isCreating ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
          <input
            className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            placeholder="Profile name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={profileType}
            onChange={(event) => setProfileType(event.target.value as ProfileType)}
          >
            {profileTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            onClick={createProfile}
            disabled={!displayName.trim()}
          >
            Create
          </button>
          {error ? <div className="text-xs text-rose-600 sm:col-span-3">{error}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
