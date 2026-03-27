import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const baseUrl = process.env.UPLOAD_API_URL;
  const apiKey = process.env.UPLOAD_API_KEY;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing UPLOAD_API_URL" }, { status: 500 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "Missing UPLOAD_API_KEY" }, { status: 500 });
  }

  const body = await request.text();
  const res = await fetch(new URL("/uploads/presign", baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body,
  });

  const payload = await res.text();
  return new NextResponse(payload, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
