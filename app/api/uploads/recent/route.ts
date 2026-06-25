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
  const profileId = url.searchParams.get("profile_id") ?? headers().get("x-moniq-profile-id");
  const target = new URL("/uploads/recent", baseUrl);
  if (limit) {
    target.searchParams.set("limit", limit);
  }
  if (profileId) {
    target.searchParams.set("profile_id", profileId);
  }
  const incoming = headers();
  const authHeader = incoming.get("authorization");
  const demoSession = incoming.get("x-moniq-demo-session");
  const res = await fetch(target, {
    cache: "no-store",
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(demoSession ? { "X-Moniq-Demo-Session": demoSession } : {}),
      ...(profileId ? { "X-Moniq-Profile-Id": profileId } : {}),
    },
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
