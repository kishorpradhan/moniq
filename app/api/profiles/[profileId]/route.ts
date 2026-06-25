import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Context = {
  params: {
    profileId: string;
  };
};

function portfolioApiUrl(profileId: string) {
  const baseUrl = process.env.PORTFOLIO_API_URL;
  if (!baseUrl) {
    throw new Error("Missing PORTFOLIO_API_URL");
  }
  return new URL(`/profiles/${profileId}`, baseUrl);
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

export async function PATCH(request: Request, context: Context) {
  let target: URL;
  try {
    target = portfolioApiUrl(context.params.profileId);
  } catch {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }

  const body = await request.text();
  const res = await fetch(target, {
    method: "PATCH",
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

export async function DELETE(_request: Request, context: Context) {
  let target: URL;
  try {
    target = portfolioApiUrl(context.params.profileId);
  } catch {
    return NextResponse.json({ error: "Missing PORTFOLIO_API_URL" }, { status: 500 });
  }

  const res = await fetch(target, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const payload = await res.text();
  return new NextResponse(payload, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
