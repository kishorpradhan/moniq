"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import LockedState from "@/components/LockedState";
import Shell from "@/components/Shell";

type ChatMode = "app" | "demo";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatRunResponse {
  run_id: string;
  conversation_id: string;
  status: string;
  response?: string | null;
  debug?: Record<string, unknown> | null;
  quota?: {
    messages_used: number;
    messages_limit: number;
    tokens_used?: number;
    tokens_limit?: number;
  };
  plan?: {
    technical_question: string;
    required_files: string[];
    api_calls: Array<{
      tool: string;
      tickers?: string[];
      date_range?: { start: string; end?: string | null };
    }>;
    tickers: string[];
  };
}

interface ChatHistoryResponse {
  conversation_id: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

const appStarterPrompts = [
  "What are my top 5 holdings and returns?",
  "Compare my portfolio vs S&P 500 YTD.",
  "Which sectors am I overweight in?",
];

const demoStarterPrompts = [
  "How is the weather?",
  "What are the top holdings?",
  "How diversified is this portfolio?",
  "Which sectors are overweight?",
  "Compare the US and India exposure.",
];

const pipelineSteps = [
  "Intent classifier",
  "Planner",
  "Portfolio retrieval",
  "Analytics tools",
  "Synthesizer",
];

const APP_HISTORY_STORAGE_KEY = "moniq_chat_conversation_id";
const DEMO_HISTORY_STORAGE_KEY = "moniq_demo_chat_conversation_id";

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function introMessage(isDemo: boolean): Message {
  return {
    id: makeId(),
    role: "assistant",
    content: isDemo
      ? "Try Moniq with a sample US and India portfolio. Ask about holdings, returns, sectors, or concentration."
      : "Hi! Ask a portfolio question and I will route it through the chat graph.",
  };
}

function formatPayload(payload: ChatRunResponse) {
  if (payload.response) return payload.response;
  if (payload.plan) return JSON.stringify(payload.plan, null, 2);
  return "I could not produce a response.";
}

export default function ChatExperience({
  mode = "app",
  embedded = false,
}: {
  mode?: ChatMode;
  embedded?: boolean;
}) {
  const isDemo = mode === "demo";
  const { token, user, userId, selectedProfile, loading, demoSession, updateDemoSession } = useAuth();
  const profileScopedStorageKey = selectedProfile?.id
    ? `${isDemo ? DEMO_HISTORY_STORAGE_KEY : APP_HISTORY_STORAGE_KEY}:${selectedProfile.id}`
    : isDemo
      ? DEMO_HISTORY_STORAGE_KEY
      : APP_HISTORY_STORAGE_KEY;
  const starterPrompts = isDemo ? demoStarterPrompts : appStarterPrompts;
  const [messages, setMessages] = useState<Message[]>([introMessage(isDemo)]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [lastDebug, setLastDebug] = useState<Record<string, unknown> | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);


  const canSend = useMemo(() => input.trim().length > 0, [input]);
  const demoMessagesUsed = demoSession?.llmCallCount ?? 0;
  const demoMessagesLimit = demoSession?.llmCallLimit ?? 0;
  const demoMessagesRemaining = Math.max(0, demoMessagesLimit - demoMessagesUsed);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(profileScopedStorageKey);
    setConversationId(stored);
    setMessages([introMessage(isDemo)]);
    setError(null);
    setLastDebug(null);
  }, [profileScopedStorageKey, isDemo]);

  useEffect(() => {
    if (!conversationId) return;
    if (!isDemo && !token) return;
    if (isDemo && !demoSession) return;
    let cancelled = false;
    const loadHistory = async () => {
      try {
        const response = await fetch(isDemo ? "/api/demo/chat/history" : "/api/chat/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(!isDemo && token ? { Authorization: `Bearer ${token}` } : {}),
            ...(selectedProfile ? { "X-Moniq-Profile-Id": selectedProfile.id } : {}),
            ...(isDemo && demoSession ? { "X-Moniq-Demo-Session": demoSession.id } : {}),
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            user_id: isDemo ? undefined : userId,
            profile_id: selectedProfile?.id,
            demo_session_id: isDemo ? demoSession?.id : undefined,
          }),
        });
        if (!response.ok) return;
        const payload = (await response.json()) as ChatHistoryResponse;
        if (!payload.messages?.length || cancelled) return;
        setMessages((currentMessages) => {
          if (currentMessages.length > payload.messages.length) {
            return currentMessages;
          }
          return payload.messages.map((message) => ({
            id: makeId(),
            role: message.role,
            content: message.content,
          }));
        });
      } catch {
        // Ignore history load errors for now.
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [conversationId, isDemo, token, userId, selectedProfile, demoSession]);

  const handleSend = async () => {
    if (!canSend || isSending) return;
    if (!isDemo && !token) {
      setError("You must be signed in to ask a question.");
      return;
    }
    if (isDemo && demoMessagesRemaining <= 0) {
      setError("You have reached today's demo limit. Sign in to continue with your own portfolio.");
      return;
    }

    const question = input.trim();
    const assistantId = makeId();
    setError(null);
    setIsSending(true);
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", content: question },
      {
        id: assistantId,
        role: "assistant",
        content: isDemo ? "Reading the sample portfolio..." : "Planning your request with the graph...",
      },
    ]);
    setInput("");

    try {
      const response = await fetch(isDemo ? "/api/demo/chat/run" : "/api/chat/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(!isDemo && token ? { Authorization: `Bearer ${token}` } : {}),
          ...(!isDemo && selectedProfile ? { "X-Moniq-Profile-Id": selectedProfile.id } : {}),
          ...(isDemo && demoSession ? { "X-Moniq-Demo-Session": demoSession.id } : {}),
        },
        body: JSON.stringify({
          question,
          conversation_id: conversationId,
          user_id: isDemo ? "demo" : userId,
          profile_id: selectedProfile?.id,
          demo_session_id: isDemo ? demoSession?.id : undefined,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
      }

      const payload = (await response.json()) as ChatRunResponse;
      if (payload.conversation_id) {
        setConversationId(payload.conversation_id);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(profileScopedStorageKey, payload.conversation_id);
        }
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, content: formatPayload(payload) } : message
        )
      );

      if (payload.debug) setLastDebug(payload.debug);
      if (isDemo && payload.quota && demoSession) {
        updateDemoSession({
          ...demoSession,
          llmCallCount: payload.quota.messages_used,
          llmCallLimit: payload.quota.messages_limit,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to reach chat service.";
      setError(isDemo ? "Unable to run demo chat." : "Unable to reach chat service.");
      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantId
            ? { ...item, content: `Sorry, something went wrong. ${errorMessage}` }
            : item
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!isDemo && loading) {
    return (
      <Shell>
        <section className="rounded-lg bg-white p-8 text-sm text-slate-500 shadow-sm">Loading chat...</section>
      </Shell>
    );
  }

  if (!isDemo && !user) {
    return (
      <Shell>
        <LockedState />
      </Shell>
    );
  }

  const content = (
    <>
      {embedded ? (
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Assistant</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Ask Moniq</h2>
          <p className="mt-2 text-sm text-slate-500">
            Questions use {selectedProfile?.displayName ?? "the selected profile"}.
          </p>
        </header>
      ) : (
        <header className="rounded-lg bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {isDemo ? "Demo chat" : "Portfolio chat"}
              </p>
              <h1 className="font-display text-3xl text-slate-900">
                {isDemo ? "Ask Moniq about a sample portfolio." : "Ask Moniq about your portfolio."}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-500">
                {isDemo
                  ? "This demo uses read-only sample data. Sign in when you are ready to analyze your own holdings."
                  : "Ask about holdings, performance, allocation, or dividends."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isDemo ? (
                <Link
                  href="/request-access"
                  className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                >
                  Analyze my portfolio
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setShowDebug((prev) => !prev)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
              >
                {showDebug ? "Hide debug" : "Show debug"}
              </button>
            </div>
          </div>
        </header>
      )}

      <section className={`grid gap-6 ${showDebug && !embedded ? "lg:grid-cols-[2fr_1fr]" : ""}`}>
        <div className={`flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm ${embedded ? "h-[calc(100vh-11rem)] min-h-[560px]" : "h-[70vh]"}`}>
          <div className={`flex-1 space-y-4 overflow-y-auto ${embedded ? "p-4" : "p-6"}`}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  message.role === "user"
                    ? "ml-auto bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>

          <div className={`border-t border-slate-100 ${embedded ? "p-4" : "p-5"}`}>
            {isDemo ? (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
                <span className="font-semibold">
                  Demo limit: {demoMessagesUsed} of {demoMessagesLimit} questions used
                </span>
                <Link href="/request-access" className="font-semibold underline">
                  Continue with my portfolio
                </Link>
              </div>
            ) : null}
            {error ? (
              <div className="mb-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-600">
                {error}
              </div>
            ) : null}
            <div className="mb-3 flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  onClick={() => setInput(prompt)}
                  disabled={isSending}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <textarea
                className="min-h-[52px] flex-1 resize-none rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                placeholder={embedded ? `Ask about ${selectedProfile?.displayName ?? "this profile"}` : "Ask about holdings, performance, allocation, or dividends"}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isSending || (isDemo && demoMessagesRemaining <= 0)}
              />
              <button
                type="button"
                className={`h-[52px] rounded-lg px-5 text-sm font-semibold transition ${
                  canSend && !isSending && (!isDemo || demoMessagesRemaining > 0)
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
                onClick={handleSend}
                disabled={!canSend || isSending || (isDemo && demoMessagesRemaining <= 0)}
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>

        {showDebug && !embedded ? (
          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Status</h2>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <div className="font-semibold text-slate-700">Identity</div>
                <div className="mt-1">
                  {isDemo
                    ? `demo session ${demoSession?.id.slice(0, 8) ?? "pending"}`
                    : user?.email ?? "unknown"}
                </div>
                <div className="mt-1">Conversation: {conversationId ?? "not started"}</div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Pipeline</h2>
              <div className="mt-4 space-y-3">
                {pipelineSteps.map((step) => (
                  <div key={step} className="flex items-center gap-3 text-sm text-slate-700">
                    <span className="h-6 w-6 rounded-full bg-emerald-100 text-center text-xs font-semibold leading-6 text-emerald-700">
                      ✓
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Debug JSON</h2>
              <pre className="mt-4 max-h-[45vh] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                {JSON.stringify(lastDebug ?? {}, null, 2)}
              </pre>
            </div>
          </aside>
        ) : null}
      </section>
    </>
  );

  if (embedded) return content;

  return <Shell>{content}</Shell>;
}
