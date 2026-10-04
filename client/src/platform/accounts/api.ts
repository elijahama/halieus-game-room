const configuredServerUrl = import.meta.env.VITE_SERVER_URL?.trim();
const apiBase = configuredServerUrl || "";
const AUTH_BOOTSTRAP_TIMEOUT_MS = 7_000;

async function fetchAuthBootstrap(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const forwardAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) controller.abort(externalSignal.reason);
  else externalSignal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = globalThis.setTimeout(() => controller.abort("account-timeout"), AUTH_BOOTSTRAP_TIMEOUT_MS);

  try {
    return await fetch(`${apiBase}${path}`, {
      ...init,
      signal: controller.signal,
      credentials: "include",
      cache: init.cache ?? "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } finally {
    globalThis.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", forwardAbort);
  }
}

export async function accountApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const boundedBootstrap = method === "GET" && path === "/auth/status";
  let response: Response;

  if (boundedBootstrap) {
    try {
      response = await fetchAuthBootstrap(path, init);
    } catch (firstError) {
      if (init.signal?.aborted) throw firstError;
      try {
        // WebKit can leave an initial navigation-owned fetch unresolved after a
        // tab/process resume. A fresh bounded request gives iPadOS one clean
        // bootstrap retry instead of leaving the first-paint curtain forever.
        response = await fetchAuthBootstrap(path, init);
      } catch {
        throw new Error("HGR could not finish checking your account. Check the connection and retry.");
      }
    }
  } else {
    response = await fetch(`${apiBase}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  }

  let body: any = null;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) {
    throw new Error(body?.reason ?? `Request failed (${response.status}).`);
  }
  return body as T;
}
