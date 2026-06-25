import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (headers().get("x-moniq-demo-session")) {
    return NextResponse.json({ error: "Uploads are disabled in demo mode" }, { status: 403 });
  }

  const baseUrl = process.env.UPLOAD_API_URL;
  const apiKey = process.env.UPLOAD_API_KEY;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing UPLOAD_API_URL" }, { status: 500 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "Missing UPLOAD_API_KEY" }, { status: 500 });
  }

  const body = await request.text();
  const incoming = headers();
  const authHeader = incoming.get("authorization");
  const profileHeader = incoming.get("x-moniq-profile-id");
  const res = await fetch(new URL("/uploads/complete", baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(profileHeader ? { "X-Moniq-Profile-Id": profileHeader } : {}),
    },
    body,
  });

  const payload = await res.text();
  return new NextResponse(payload, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
