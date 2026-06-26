import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEMO_SESSION_COOKIE = "moniq_demo_session_id";

type DemoSessionPayload = {
  session?: {
    id: string;
    expiresAt?: string | null;
  };
};

function setDemoSessionCookie(response: NextResponse, payload: DemoSessionPayload) {
  if (!payload.session?.id) return;
  response.cookies.set({
    name: DEMO_SESSION_COOKIE,
    value: payload.session.id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: payload.session.expiresAt ? new Date(payload.session.expiresAt) : undefined,
  });
}

export async function POST() {
  const baseUrl = process.env.PORTFOLIO_API_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }

  const existingSessionId = cookies().get(DEMO_SESSION_COOKIE)?.value;
  if (existingSessionId) {
    const existingRes = await fetch(new URL(`/demo/session/${existingSessionId}`, baseUrl), {
      cache: "no-store",
    });
    if (existingRes.ok) {
      const payload = (await existingRes.json()) as DemoSessionPayload;
      const response = NextResponse.json(payload);
      setDemoSessionCookie(response, payload);
      return response;
    }
  }

  const res = await fetch(new URL("/demo/session", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const payload = (await res.json()) as DemoSessionPayload;
  const response = NextResponse.json(payload, { status: res.status });
  if (res.ok) setDemoSessionCookie(response, payload);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: DEMO_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
