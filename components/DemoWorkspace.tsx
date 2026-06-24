"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { demoAllocation, demoPositions, demoSummary } from "@/lib/demoData";
import { getDemoSessionId } from "@/lib/demoSession";

type DemoTab = "analyze" | "data";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatRunResponse = {
  conversation_id: string;
  response?: string | null;
};

const tabs: Array<{ id: DemoTab; label: string }> = [
  { id: "analyze", label: "Analyze" },
  { id: "data", label: "Sample data" },
];

const sampleFiles = [
  {
    name: "sample-us-brokerage.csv",
    rows: 18,
    status: "Processed",
    description: "US equities and ETF transactions",
  },
  {
    name: "sample-india-brokerage.csv",
    rows: 11,
    status: "Processed",
    description: "India equity transactions",
  },
];

const suggestedPrompts = ["Biggest holding?", "US vs India?", "Which sectors are overweight?"];
const DEMO_DAILY_MESSAGE_LIMIT = 10;
const DEMO_USAGE_STORAGE_KEY = "moniq_demo_chat_usage";
const DEMO_CONVERSATION_STORAGE_KEY = "moniq_demo_chat_conversation_id";

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatSignedMoney(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatMoney(value)}`;
}

function formatPct(value: number | null, digits = 1) {
  if (value === null) return "-";
  return `${(value * 100).toFixed(digits)}%`;
}

function getDemoUsage() {
  if (typeof window === "undefined") return 0;

  const raw = window.localStorage.getItem(DEMO_USAGE_STORAGE_KEY);
  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw) as { date?: string; messagesUsed?: number };
    if (parsed.date !== todayKey()) return 0;
    return parsed.messagesUsed ?? 0;
  } catch {
    return 0;
  }
}

function saveDemoUsage(messagesUsed: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DEMO_USAGE_STORAGE_KEY,
    JSON.stringify({ date: todayKey(), messagesUsed })
  );
}

function EyeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 6h14v9H8l-3 3V6Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

export default function DemoWorkspace({ initialTab = "analyze" }: { initialTab?: DemoTab }) {
  const validInitialTab = useMemo(
    () => (tabs.some((tab) => tab.id === initialTab) ? initialTab : "analyze"),
    [initialTab]
  );
  const [activeTab, setActiveTab] = useState<DemoTab>(validInitialTab);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: makeId(),
      role: "assistant",
      content: "Ask about the sample portfolio, or tap a holding to start.",
    },
  ]);
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  const messagesLeft = Math.max(0, DEMO_DAILY_MESSAGE_LIMIT - messagesUsed);
  const topTickers = demoAllocation.tickers.slice(0, 5).map((ticker) => {
    const position = demoPositions.open.find((item) => item.ticker === ticker.ticker);
    return {
      ...ticker,
      unrealizedPl: position?.unrealizedPl ?? 0,
      returnPct: position?.returnPct ?? null,
    };
  });
  const topSector = demoAllocation.sectors[0];

  useEffect(() => {
    setDemoSessionId(getDemoSessionId());
    setMessagesUsed(getDemoUsage());
    if (typeof window !== "undefined") {
      setConversationId(window.localStorage.getItem(DEMO_CONVERSATION_STORAGE_KEY));
    }
  }, []);

  const askQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isSending) return;
    if (messagesLeft <= 0) {
      setError("You have reached today's demo limit. Request access to continue with your own portfolio.");
      return;
    }

    const assistantId = makeId();
    setError(null);
    setInput("");
    setIsSending(true);
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", content: trimmed },
      { id: assistantId, role: "assistant", content: "Reading the sample portfolio..." },
    ]);

    try {
      const response = await fetch("/api/demo/chat/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          conversation_id: conversationId,
          demo_session_id: demoSessionId,
          user_id: "demo",
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
      }

      const payload = (await response.json()) as ChatRunResponse;
      if (payload.conversation_id) {
        setConversationId(payload.conversation_id);
        window.localStorage.setItem(DEMO_CONVERSATION_STORAGE_KEY, payload.conversation_id);
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, content: payload.response ?? "I could not produce a response." }
            : message
        )
      );

      const nextUsed = messagesUsed + 1;
      setMessagesUsed(nextUsed);
      saveDemoUsage(nextUsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to run demo chat.";
      setError(message);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantId
            ? { ...item, content: `Sorry, something went wrong. ${message}` }
            : item
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const askFromHolding = (question: string) => {
    setIsMobileChatOpen(true);
    askQuestion(question);
  };

  const chatPanel = (
    <div className="flex h-full min-h-[520px] flex-col bg-[#fbfaf7]">
      <div className="flex items-center gap-3 px-6 py-5">
        <ChatIcon />
        <h2 className="text-lg font-bold text-slate-950">Ask Moniq</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
              message.role === "user"
                ? "ml-auto border border-slate-200 bg-white text-slate-900"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <div className="space-y-4 px-6 py-5">
        <div>
          <p className="text-sm font-semibold text-stone-500">Suggested</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => askQuestion(prompt)}
                disabled={isSending || messagesLeft <= 0}
                className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-slate-500 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <form
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            askQuestion(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about this portfolio..."
            disabled={isSending || messagesLeft <= 0}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending || messagesLeft <= 0}
            className="text-2xl leading-none text-stone-600 disabled:text-stone-300"
            aria-label="Send demo question"
          >
            -&gt;
          </button>
        </form>
        <p className="text-center text-sm font-semibold text-stone-500">
          {messagesLeft} questions left in demo
        </p>
      </div>
    </div>
  );

  return (
    <div className="px-6 py-10 lg:px-12">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-100 px-6 py-4 text-blue-800">
          <div className="flex items-center gap-3 font-semibold">
            <EyeIcon />
            <span>Sample portfolio - read-only</span>
          </div>
          <Link href="/request-access" className="font-semibold hover:text-blue-950">
            Analyze my own -&gt;
          </Link>
        </div>

        <div className="flex gap-8 border-b border-slate-200 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 py-4 text-base font-semibold ${
                activeTab === tab.id
                  ? "border-slate-950 text-slate-950"
                  : "border-transparent text-stone-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "analyze" ? (
          <div className="grid lg:grid-cols-[1.25fr_1fr]">
            <div className="space-y-6 p-6 lg:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#f3f1eb] p-5">
                  <p className="text-sm font-semibold text-stone-600">Total value</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950">
                    {formatMoney(demoSummary.totalValue)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f3f1eb] p-5">
                  <p className="text-sm font-semibold text-stone-600">Unrealized P&amp;L</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-700">
                    {formatPct(demoSummary.unrealizedPct)}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between gap-4">
                  <h2 className="text-xl font-bold text-slate-950">Holdings</h2>
                  <div className="hidden grid-cols-[70px_96px_86px_86px] gap-4 text-right text-xs font-semibold uppercase tracking-wide text-stone-400 sm:grid">
                    <span>Weight</span>
                    <span>Value</span>
                    <span>P&amp;L</span>
                    <span>Return</span>
                  </div>
                </div>
                <div className="mt-4 divide-y divide-slate-200">
                  {topTickers.map((ticker, index) => (
                    <button
                      key={ticker.ticker}
                      type="button"
                      onClick={() =>
                        askFromHolding(
                          `Give me more detail on ${ticker.ticker}: weight, market value, profit, return, and whether it is driving portfolio risk.`
                        )
                      }
                      className="grid w-full gap-3 py-3 text-left hover:text-blue-700 sm:grid-cols-[1fr_70px_96px_86px_86px] sm:items-center sm:gap-4"
                    >
                      <span className="text-lg font-semibold text-slate-950">
                        {ticker.ticker}
                        {index === 0 ? (
                          <span className="ml-2 text-sm font-medium text-stone-500">tap to ask</span>
                        ) : null}
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-sm sm:contents">
                        <span className="flex justify-between gap-3 sm:block sm:text-right">
                          <span className="font-semibold text-stone-400 sm:hidden">Weight</span>
                          <span className="font-semibold text-stone-800">{formatPct(ticker.weight)}</span>
                        </span>
                        <span className="flex justify-between gap-3 sm:block sm:text-right">
                          <span className="font-semibold text-stone-400 sm:hidden">Value</span>
                          <span className="font-semibold text-stone-800">{formatMoney(ticker.marketValue)}</span>
                        </span>
                        <span className="flex justify-between gap-3 sm:block sm:text-right">
                          <span className="font-semibold text-stone-400 sm:hidden">P&amp;L</span>
                          <span
                            className={`font-semibold ${
                              ticker.unrealizedPl >= 0 ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {formatSignedMoney(ticker.unrealizedPl)}
                          </span>
                        </span>
                        <span className="flex justify-between gap-3 sm:block sm:text-right">
                          <span className="font-semibold text-stone-400 sm:hidden">Return</span>
                          <span
                            className={`font-semibold ${
                              (ticker.returnPct ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {formatPct(ticker.returnPct)}
                          </span>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Largest sector
                </p>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold text-slate-950">{topSector?.sector ?? "-"}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      Concentrated in AAPL, NVDA, and MSFT.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => askFromHolding("Why is Technology overweight?")}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-500"
                  >
                    Ask why
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden border-l border-slate-200 lg:block">{chatPanel}</div>

            <button
              type="button"
              onClick={() => setIsMobileChatOpen(true)}
              className="fixed inset-x-4 bottom-4 z-30 rounded-2xl bg-slate-950 px-5 py-4 text-base font-semibold text-white shadow-xl lg:hidden"
            >
              Ask Moniq
            </button>

            {isMobileChatOpen ? (
              <div className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden">
                <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div className="font-bold text-slate-950">Ask Moniq</div>
                    <button
                      type="button"
                      onClick={() => setIsMobileChatOpen(false)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-stone-600"
                    >
                      Close
                    </button>
                  </div>
                  {chatPanel}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "data" ? (
          <section className="space-y-5 p-6 lg:p-8">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Sample data</h2>
              <p className="mt-2 max-w-2xl text-sm text-stone-500">
                These files are preloaded for the public demo. Upload your own portfolio
                after requesting access.
              </p>
            </div>
            <div className="space-y-3">
              {sampleFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-5 py-4"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{file.name}</div>
                    <div className="text-sm text-stone-500">
                      {file.description} - {file.rows} rows
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {file.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}
