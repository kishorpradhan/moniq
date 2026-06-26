import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEMO_SESSION_COOKIE = "moniq_demo_session_id";

export async function POST(request: Request) {
  const baseUrl = process.env.PORTFOLIO_API_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }

  let payload: { demoSessionId?: string | null } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    payload = {};
  }
  const demoSessionId = payload.demoSessionId ?? cookies().get(DEMO_SESSION_COOKIE)?.value;
  if (!demoSessionId) {
    return NextResponse.json({ error: "Missing demoSessionId" }, { status: 400 });
  }

  const res = await fetch(new URL("/demo/session/consume", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ demoSessionId }),
  });
  const responseBody = await res.text();
  return new NextResponse(responseBody, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
