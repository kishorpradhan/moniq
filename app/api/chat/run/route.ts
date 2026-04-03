import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const baseUrl = process.env.CHAT_AGENT_URL ?? process.env.NEXT_PUBLIC_CHAT_AGENT_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "CHAT_AGENT_URL is not configured." },
      { status: 500 }
    );
  }

  let payload: { question?: string; conversation_id?: string | null; user_id?: string | null } = {};
  const authHeader = request.headers.get("authorization");
  try {
    payload = (await request.json()) as { question?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.question) {
    return NextResponse.json({ error: "Missing question." }, { status: 400 });
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify({
      question: payload.question,
      conversation_id: payload.conversation_id ?? null,
      user_id: payload.user_id ?? null,
    }),
  });

  const contentType = response.headers.get("content-type") ?? "application/json";
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: { "content-type": contentType },
  });
}
