export async function authFetch(
  input: RequestInfo | URL,
  token: string | null,
  init: RequestInit = {}
) {
  const headers = new Headers(init.headers ?? {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
