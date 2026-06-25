import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function portfolioApiUrl(path: string) {
  const baseUrl = process.env.PORTFOLIO_API_URL;
  if (!baseUrl) {
    throw new Error("Missing PORTFOLIO_API_URL");
  }
  return new URL(path, baseUrl);
}

function authHeaders(): Record<string, string> {
  const incoming = headers();
  const authHeader = incoming.get("authorization");
  const demoSession = incoming.get("x-moniq-demo-session");
  return {
    ...(authHeader ? { Authorization: authHeader } : {}),
    ...(demoSession ? { "X-Moniq-Demo-Session": demoSession } : {}),
  };
}

export async function GET() {
  let target: URL;
  try {
    target = portfolioApiUrl("/profiles");
  } catch {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }

  const res = await fetch(target, {
    cache: "no-store",
    headers: authHeaders(),
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  let target: URL;
  try {
    target = portfolioApiUrl("/profiles");
  } catch {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }

  const body = await request.text();
  const res = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body,
  });
  const payload = await res.text();
  return new NextResponse(payload, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
