import { NextResponse } from "next/server";

import { getDemoChatAnswer } from "@/lib/demoData";

const DEMO_DAILY_MESSAGE_LIMIT = 10;

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}`;
}

export async function POST(request: Request) {
  let payload: {
    question?: string;
    conversation_id?: string | null;
    demo_session_id?: string | null;
    user_id?: string | null;
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

  return NextResponse.json({
    run_id: createId("demo_run"),
    conversation_id: payload.conversation_id ?? createId("demo_conversation"),
    status: "completed",
    response: getDemoChatAnswer(payload.question),
    quota: {
      messages_limit: DEMO_DAILY_MESSAGE_LIMIT,
    },
    debug: {
      mode: "demo",
      demo_user_id: "demo",
      demo_session_id: payload.demo_session_id,
      note: "Temporary frontend demo response. Backend should enforce quota before LLM calls.",
    },
  });
}
