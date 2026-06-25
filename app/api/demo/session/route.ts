import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const baseUrl = process.env.PORTFOLIO_API_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }

  const res = await fetch(new URL("/demo/session", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
