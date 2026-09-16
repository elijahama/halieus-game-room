const configuredServerUrl = import.meta.env.VITE_SERVER_URL?.trim();
const apiBase = configuredServerUrl || "";

export async function accountApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  let body: any = null;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) {
    throw new Error(body?.reason ?? `Request failed (${response.status}).`);
  }
  return body as T;
}
