import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const uploadApiUrl = process.env.UPLOAD_API_URL;
  const uploadApiKey = process.env.UPLOAD_API_KEY;

  if (!uploadApiUrl || !uploadApiKey) {
    return NextResponse.json({ detail: "Server not configured" }, { status: 500 });
  }

  const payload = await request.json();
  const response = await fetch(`${uploadApiUrl}/uploads/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": uploadApiKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
