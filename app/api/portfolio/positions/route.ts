import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.PORTFOLIO_API_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }
  const incoming = headers();
  const authHeader = incoming.get("authorization");
  const res = await fetch(new URL("/portfolio/positions", baseUrl), {
    cache: "no-store",
    headers: authHeader ? { Authorization: authHeader } : undefined,
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
