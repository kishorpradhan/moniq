"use client";

import { useEffect, useMemo, useState } from "react";

import Shell from "@/components/Shell";
import { useAuth } from "@/components/AuthProvider";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  debug?: Record<string, unknown> | null;
}

interface ChatRunResponse {
  run_id: string;
  conversation_id: string;
  status: string;
  response?: string | null;
  followup_needed?: boolean;
  debug?: Record<string, unknown> | null;
  plan: {
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

const starterPrompts = [
  "What are my top 5 holdings and returns?",
  "Compare my portfolio vs S&P 500 YTD.",
  "Which sectors am I overweight in?",
];

const pipelineSteps = [
  {
    name: "Intent classifier",
    description: "Determines if the question is finance-related.",
  },
  {
    name: "Planner",
    description: "Translates the request into required data + tools.",
  },
  {
    name: "Vector retrieval",
    description: "Fetches relevant portfolio context from Qdrant.",
  },
  {
    name: "Code generation",
    description: "Only runs if retrieval has no match.",
  },
  {
    name: "Sandbox runner",
    description: "Executes generated code safely.",
  },
  {
    name: "Synthesizer",
    description: "Writes the final response.",
  },
];

const HISTORY_STORAGE_KEY = "moniq_chat_conversation_id";

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: makeId(),
      role: "assistant",
      content:
        "Hi! Ask a portfolio question and I will route it through the chat graph.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { token, user, userId, loading } = useAuth();

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const formatPlan = (payload: ChatRunResponse) => {
    if (payload.response) {
      return payload.response;
    }
    return JSON.stringify(payload.plan, null, 2);
  };

  const handleSend = async () => {
    if (!canSend || isSending) return;
    if (!token) {
      setError("You must be signed in to ask a question.");
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
        content: "Planning your request with the graph...",
      },
    ]);
    setInput("");

    try {
      const response = await fetch("/api/chat/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question, conversation_id: conversationId, user_id: userId }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
      }
      const payload = (await response.json()) as ChatRunResponse;
      if (payload.conversation_id) {
        setConversationId(payload.conversation_id);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(HISTORY_STORAGE_KEY, payload.conversation_id);
        }
      }
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, content: formatPlan(payload), debug: payload.debug ?? null }
            : message
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to reach chat service.";
      setError("Unable to reach chat service.");
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      setConversationId(stored);
    }
  }, []);

  useEffect(() => {
    if (!conversationId || !token) return;
    let cancelled = false;
    const loadHistory = async () => {
      try {
        const response = await fetch("/api/chat/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ conversation_id: conversationId, user_id: userId }),
        });
        if (!response.ok) return;
        const payload = (await response.json()) as ChatHistoryResponse;
        if (!payload.messages?.length || cancelled) return;
        setMessages(
          payload.messages.map((message) => ({
            id: makeId(),
            role: message.role,
            content: message.content,
          }))
        );
      } catch {
        // Ignore history load errors for now.
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [conversationId, token, userId]);

  return (
    <Shell>
      <header className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Portfolio chat</p>
        <h1 className="font-display text-3xl text-slate-900">Ask your portfolio anything</h1>
        <p className="text-sm text-slate-500">
          This is a mock chat screen to validate the flow. We will wire the graph next.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex h-[70vh] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "ml-auto bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {message.content}
                </div>
                {showDebug && message.role === "assistant" && message.debug ? (
                  <pre className="max-w-[85%] overflow-x-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
                    {JSON.stringify(message.debug, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 p-5">
            <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <div className="font-semibold text-slate-700">Debug</div>
              <div className="mt-1">
                Auth status:{" "}
                {loading
                  ? "loading"
                  : user
                  ? `signed in (${user.email ?? "unknown"})`
                  : "not signed in"}
              </div>
              <div className="mt-1">Token: {token ? "present" : "missing"}</div>
              <div className="mt-1">
                Conversation: {conversationId ? conversationId : "not started"}
              </div>
              <button
                type="button"
                onClick={() => setShowDebug((prev) => !prev)}
                className="mt-3 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:border-slate-300 hover:text-slate-700"
              >
                {showDebug ? "Hide Debug" : "Show Debug"}
              </button>
            </div>
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
                className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                placeholder="Ask about holdings, performance, allocation, or dividends"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isSending}
              />
              <button
                type="button"
                className={`h-[52px] rounded-2xl px-5 text-sm font-semibold transition ${
                  canSend && !isSending
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
                onClick={handleSend}
                disabled={!canSend || isSending}
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Chat graph steps</h2>
            <p className="mt-2 text-xs text-slate-500">
              This is the planned pipeline for each question.
            </p>
            <div className="mt-4 space-y-3">
              {pipelineSteps.map((step, index) => (
                <div key={step.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Step {index + 1}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{step.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{step.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Backend status</h2>
            <p className="mt-2 text-xs text-slate-500">
              Graph execution is not connected yet. Once wired, this panel will show live node updates.
            </p>
          </div>
        </aside>
      </section>
    </Shell>
  );
}
