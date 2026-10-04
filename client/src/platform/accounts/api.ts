const configuredServerUrl = import.meta.env.VITE_SERVER_URL?.trim();
const apiBase = configuredServerUrl || "";
const DEFAULT_ACCOUNT_TIMEOUT_MS = 10_000;

function combineAbortSignals(external: AbortSignal | null | undefined, controller: AbortController): () => void {
  if (!external) return () => undefined;
  if (external.aborted) {
    controller.abort(external.reason);
    return () => undefined;
  }
  const abort = () => controller.abort(external.reason);
  external.addEventListener("abort", abort, { once: true });
  return () => external.removeEventListener("abort", abort);
}

export async function accountApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const detachExternalSignal = combineAbortSignals(init.signal, controller);
  const timeout = globalThis.setTimeout(() => controller.abort("account-timeout"), DEFAULT_ACCOUNT_TIMEOUT_MS);
  const method = (init.method || "GET").toUpperCase();

  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      signal: controller.signal,
      credentials: "include",
      cache: init.cache ?? (method === "GET" ? "no-store" : "default"),
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
  } catch (error) {
    if (controller.signal.aborted && !init.signal?.aborted) {
      throw new Error("HGR could not finish checking your account. Check the connection and retry.");
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    detachExternalSignal();
  }
}
