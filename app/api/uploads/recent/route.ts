import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const baseUrl = process.env.PORTFOLIO_API_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const target = new URL("/uploads/recent", baseUrl);
  if (limit) {
    target.searchParams.set("limit", limit);
  }
  const incoming = headers();
  const authHeader = incoming.get("authorization");
  const res = await fetch(target, {
    cache: "no-store",
    headers: authHeader ? { Authorization: authHeader } : undefined,
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
