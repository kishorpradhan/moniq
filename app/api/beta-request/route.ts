const BUCKET_NAME = "moniq-private";
const OBJECT_NAME = "beta_requests.txt";

async function getAccessToken() {
  const host = process.env.GCP_METADATA_HOST ?? "metadata.google.internal";
  const res = await fetch(`http://${host}/computeMetadata/v1/instance/service-accounts/default/token`, {
    headers: { "Metadata-Flavor": "Google" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Metadata token fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string };
  if (!data?.access_token) {
    throw new Error("Missing access token");
  }
  return data.access_token;
}

async function fetchExisting(accessToken: string) {
  const encoded = encodeURIComponent(OBJECT_NAME);
  const res = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${encoded}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );
  if (res.status === 404) return "";
  if (!res.ok) {
    throw new Error(`GCS read failed: ${res.status}`);
  }
  return res.text();
}

async function writeObject(accessToken: string, content: string) {
  const encoded = encodeURIComponent(OBJECT_NAME);
  const res = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${encoded}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: content,
    }
  );
  if (!res.ok) {
    throw new Error(`GCS write failed: ${res.status}`);
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as { email?: string };
    const email = payload.email?.trim();
    if (!email || !email.includes("@")) {
      return new Response("Invalid email", { status: 400 });
    }

    const token = await getAccessToken();
    const existing = await fetchExisting(token);
    const line = `${new Date().toISOString()},${email}`;
    const nextContent = existing ? `${existing.trim()}\n${line}\n` : `${line}\n`;
    await writeObject(token, nextContent);

    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response("Unable to submit request.", { status: 500 });
  }
}
