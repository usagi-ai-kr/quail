export type AuthFailure = "unauthenticated" | "invalid-password" | "rate-limited" | "unavailable";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; reason: AuthFailure; retryAfterSeconds?: number };

export type SessionResult =
  | { authenticated: true }
  | { authenticated: false; reason?: "unavailable" };

export interface ProtectedContent {
  heading: string;
  message: string;
}

export type ProtectedContentResult =
  | { ok: true; content: ProtectedContent }
  | { ok: false; reason: "unauthenticated" | "unavailable" };

/** UI-facing port; HTTP and ky details stay in infra/client. */
export interface AuthClient {
  getSession(): Promise<SessionResult>;
  getProtectedContent(): Promise<ProtectedContentResult>;
  login(password: string): Promise<AuthActionResult>;
  logout(): Promise<AuthActionResult>;
}
