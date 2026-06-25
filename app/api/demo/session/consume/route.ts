import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const baseUrl = process.env.PORTFOLIO_API_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }

  const body = await request.text();
  const res = await fetch(new URL("/demo/session/consume", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const payload = await res.text();
  return new NextResponse(payload, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
