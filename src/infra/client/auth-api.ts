import ky, { HTTPError } from "ky";
import type { AuthActionResult, AuthClient, ProtectedContentResult, SessionResult } from "../../app/auth-client";

type FetchImplementation = (input: Request, init?: RequestInit) => Promise<Response>;

function unavailable(): AuthActionResult {
  return { ok: false, reason: "unavailable" };
}

/** Construct the HTTP adapter so the app can receive it through its AuthClient port. */
export function createAuthClient(fetchImplementation?: FetchImplementation): AuthClient {
  const options = {
    credentials: "same-origin" as const,
    retry: 0 as const,
    headers: { Accept: "application/json" },
  };
  const api = ky.create(fetchImplementation ? { ...options, fetch: fetchImplementation } : options);
  const origin = typeof globalThis.location === "undefined" ? "https://quail.test" : globalThis.location.origin;
  const endpoint = (path: string) => new URL(path, origin);

  return {
    async getSession(): Promise<SessionResult> {
      try {
        return await api.get(endpoint("/api/auth/session")).json<SessionResult>();
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 401) return { authenticated: false };
        return { authenticated: false, reason: "unavailable" };
      }
    },

    async getProtectedContent(): Promise<ProtectedContentResult> {
      try {
        const content = await api.get(endpoint("/api/content")).json<{ heading: string; message: string }>();
        return { ok: true, content };
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 401) {
          return { ok: false, reason: "unauthenticated" };
        }
        return { ok: false, reason: "unavailable" };
      }
    },

    async login(password: string): Promise<AuthActionResult> {
      try {
        await api.post(endpoint("/api/auth/login"), { json: { password } });
        return { ok: true };
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 401) {
          return { ok: false, reason: "invalid-password" };
        }
        if (error instanceof HTTPError && error.response.status === 429) {
          return { ok: false, reason: "rate-limited", retryAfterSeconds: Number(error.response.headers.get("Retry-After") ?? 0) };
        }
        return unavailable();
      }
    },

    async logout(): Promise<AuthActionResult> {
      try {
        await api.post(endpoint("/api/auth/logout"));
        return { ok: true };
      } catch {
        return unavailable();
      }
    },
  };
}
