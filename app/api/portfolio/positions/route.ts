import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const baseUrl = process.env.PORTFOLIO_API_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }

  const incoming = headers();
  const authHeader = incoming.get("authorization");
  const demoSession = incoming.get("x-moniq-demo-session");
  const profileHeader = incoming.get("x-moniq-profile-id");
  const sourceUrl = new URL(request.url);
  const profileId = sourceUrl.searchParams.get("profile_id") ?? profileHeader;
  const target = new URL("/portfolio/positions", baseUrl);
  if (profileId) {
    target.searchParams.set("profile_id", profileId);
  }

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
