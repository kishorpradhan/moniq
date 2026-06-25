import { NextResponse } from "next/server";

import { getDemoChatAnswer } from "@/lib/demoData";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}`;
}

type DemoSession = {
  id: string;
  demoUserId: string;
  llmCallCount: number;
  llmCallLimit: number;
  expiresAt?: string | null;
};

function hasUsableChatResponse(payload: unknown): payload is { status?: string; response?: string | null } {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as { status?: string; response?: string | null };
  return candidate.status !== "error" && Boolean(candidate.response);
}

export async function POST(request: Request) {
  let payload: {
    question?: string;
    conversation_id?: string | null;
    demo_session_id?: string | null;
    profile_id?: string | null;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.question) {
    return NextResponse.json({ error: "Missing question." }, { status: 400 });
  }

  if (!payload.demo_session_id) {
    return NextResponse.json({ error: "Missing demo_session_id." }, { status: 400 });
  }

  const consumeResponse = await fetch(new URL("/api/demo/session/consume", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ demoSessionId: payload.demo_session_id }),
  });

  if (!consumeResponse.ok) {
    const text = await consumeResponse.text();
    return new NextResponse(text || JSON.stringify({ error: "Demo chat limit reached" }), {
      status: consumeResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const consumed = (await consumeResponse.json()) as { session: DemoSession };
  const quota = {
    messages_used: consumed.session.llmCallCount,
    messages_limit: consumed.session.llmCallLimit,
  };

  const baseUrl = process.env.CHAT_AGENT_URL ?? process.env.NEXT_PUBLIC_CHAT_AGENT_URL;
  if (baseUrl) {
    try {
      const chatResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Moniq-Demo-Session": payload.demo_session_id,
          ...(payload.profile_id ? { "X-Moniq-Profile-Id": payload.profile_id } : {}),
        },
        body: JSON.stringify({
          question: payload.question,
          conversation_id: payload.conversation_id ?? null,
          user_id: consumed.session.demoUserId,
          profile_id: payload.profile_id ?? null,
          demo_session_id: payload.demo_session_id,
        }),
      });

      if (chatResponse.ok) {
        const chatPayload = await chatResponse.json();
        if (hasUsableChatResponse(chatPayload)) {
          return NextResponse.json({ ...chatPayload, quota });
        }
      }
    } catch {
      // Fall through to deterministic demo response.
    }
  }

  return NextResponse.json({
    run_id: createId("demo_run"),
    conversation_id: payload.conversation_id ?? createId("demo_conversation"),
    status: "completed",
    response: getDemoChatAnswer(payload.question),
    quota,
    debug: {
      mode: "demo",
      demo_user_id: consumed.session.demoUserId,
      demo_session_id: payload.demo_session_id,
      profile_id: payload.profile_id ?? null,
      note: "Fallback demo response used because the chat agent was unavailable or rejected the anonymous demo request.",
    },
  });
}
