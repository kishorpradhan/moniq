import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEMO_SESSION_COOKIE = "moniq_demo_session_id";

type DemoSessionPayload = {
  session?: {
    id: string;
    demoUserId: string;
  };
};

export async function POST(request: Request) {
  const chatBaseUrl = process.env.CHAT_AGENT_URL ?? process.env.NEXT_PUBLIC_CHAT_AGENT_URL;
  if (!chatBaseUrl) {
    return NextResponse.json({ error: "CHAT_AGENT_URL is not configured." }, { status: 500 });
  }

  const portfolioBaseUrl = process.env.PORTFOLIO_API_URL;
  if (!portfolioBaseUrl) {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }

  let payload: {
    conversation_id?: string;
    demo_session_id?: string | null;
    profile_id?: string | null;
  } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.conversation_id) {
    return NextResponse.json({ error: "Missing conversation_id." }, { status: 400 });
  }

  const demoSessionId =
    payload.demo_session_id ??
    request.headers.get("x-moniq-demo-session") ??
    cookies().get(DEMO_SESSION_COOKIE)?.value;
  if (!demoSessionId) {
    return NextResponse.json({ error: "Missing demo session." }, { status: 401 });
  }

  const sessionResponse = await fetch(new URL(`/demo/session/${demoSessionId}`, portfolioBaseUrl), {
    cache: "no-store",
  });
  if (!sessionResponse.ok) {
    return NextResponse.json({ error: "Invalid or expired demo session." }, { status: 401 });
  }
  const sessionPayload = (await sessionResponse.json()) as DemoSessionPayload;
  const demoUserId = sessionPayload.session?.demoUserId;
  if (!demoUserId) {
    return NextResponse.json({ error: "Invalid demo session." }, { status: 401 });
  }

  const profileId = payload.profile_id ?? request.headers.get("x-moniq-profile-id");
  const response = await fetch(`${chatBaseUrl.replace(/\/$/, "")}/chat/history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Moniq-Demo-Session": demoSessionId,
      ...(profileId ? { "X-Moniq-Profile-Id": profileId } : {}),
    },
    body: JSON.stringify({
      conversation_id: payload.conversation_id,
      user_id: demoUserId,
      profile_id: profileId ?? null,
      demo_session_id: demoSessionId,
    }),
  });

  const contentType = response.headers.get("content-type") ?? "application/json";
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { "content-type": contentType },
  });
}
