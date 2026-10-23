import { Hono } from "hono";
import { login } from "../../app/login";
import { isValidPasetoLocalKey, SESSION_COOKIE, createSessionToken, hasValidSession } from "./auth-session";

interface DurableObjectIdLike {}
interface DurableObjectStubLike {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}
interface DurableObjectNamespaceLike {
  idFromName(name: string): DurableObjectIdLike;
  get(id: DurableObjectIdLike): DurableObjectStubLike;
}

export interface AuthBindings {
  PASSWORD?: string;
  PASETO_KEY?: string;
  AUTH_RATE_LIMITER?: DurableObjectNamespaceLike;
  ASSETS?: { fetch(request: Request): Promise<Response> };
}

const PUBLIC_LOGIN_PATHS = new Set([
  "/", "/index.html", "/assets/login.js", "/assets/login.css",
  "/favicon.svg", "/favicon-96x96.png", "/favicon.ico", "/apple-touch-icon.png",
  "/site.webmanifest", "/web-app-manifest-192x192.png", "/web-app-manifest-512x512.png",
  "/fonts/NIXGONL-Vb.woff", "/fonts/NIXGONM-Vb.woff", "/fonts/NIXGONB-Vb.woff",
  "/fonts/PretendardVariable.woff2", "/fonts/Pretendard-OFL.txt",
]);
const MAX_LOGIN_BODY_BYTES = 1024;

function isPublicViteDevPath(path: string): boolean {
  if (!import.meta.env.DEV) return false;
  return path === "/@vite/client"
    || path.startsWith("/src/")
    || path.startsWith("/node_modules/.vite/deps/")
    || path.startsWith("/@id/");
}

function secretsReady(env: AuthBindings): env is AuthBindings & { PASSWORD: string; PASETO_KEY: string } {
  return typeof env.PASSWORD === "string" && env.PASSWORD.length > 0 && isValidPasetoLocalKey(env.PASETO_KEY);
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return origin !== null && origin === new URL(request.url).origin;
}

function readCookie(header: string | null | undefined): string | undefined {
  for (const segment of (header ?? "").split(";")) {
    const [name, ...value] = segment.trim().split("=");
    if (name === SESSION_COOKIE) return value.join("=") || undefined;
  }
  return undefined;
}

function responseHeaders(response: Response, extra: Record<string, string> = {}): Headers {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(extra)) headers.set(name, value);
  return headers;
}

type LoginBodyResult = { kind: "ok"; value: unknown } | { kind: "invalid" } | { kind: "too-large" };

async function readLoginBody(request: Request): Promise<LoginBodyResult> {
  const contentType = request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json" || !request.body) return { kind: "invalid" };

  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_LOGIN_BODY_BYTES) return { kind: "too-large" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_LOGIN_BODY_BYTES) {
        await reader.cancel();
        return { kind: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { kind: "invalid" };
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { kind: "ok", value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) };
  } catch {
    return { kind: "invalid" };
  }
}

async function rateLimitClientId(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createAuthApp() {
  const app = new Hono<{ Bindings: AuthBindings }>();

  app.use("*", async (context, next) => {
    await next();
    context.header("Cache-Control", "no-store");
    context.header("X-Content-Type-Options", "nosniff");
  });

  app.onError((_error, context) => context.body(null, 503));

  app.post("/api/auth/login", async (context) => {
    if (!isSameOrigin(context.req.raw)) return context.body(null, 403);
    const env = context.env;
    if (!secretsReady(env)) return context.body(null, 503);

    const parsed = await readLoginBody(context.req.raw);
    if (parsed.kind === "too-large") return context.body(null, 413);
    if (parsed.kind === "invalid") return context.body(null, 400);
    const body = parsed.value;
    if (typeof body !== "object" || body === null || typeof (body as { password?: unknown }).password !== "string") {
      return context.body(null, 400);
    }

    const ip = context.req.header("CF-Connecting-IP");
    const namespace = env.AUTH_RATE_LIMITER;
    if (!ip || !namespace) return context.body(null, 503);

    let limiterResponse: Response | undefined;
    const result = await login((body as { password: string }).password, env.PASSWORD, {
      recordAttempt: async (passwordMatches) => {
        const clientId = await rateLimitClientId(ip);
        const stub = namespace.get(namespace.idFromName(clientId));
        limiterResponse = await stub.fetch("https://auth-rate-limit/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: passwordMatches }),
        });
        if (limiterResponse.status === 429) {
          return { allowed: false, retryAfterSeconds: Number(limiterResponse.headers.get("Retry-After") ?? "900") };
        }
        if (!limiterResponse.ok) throw new Error("Rate limiter unavailable");
        return { allowed: true, retryAfterSeconds: 0 };
      },
      issueSession: () => createSessionToken(env.PASETO_KEY),
    });

    if (result.kind === "rate-limited") {
      return new Response(null, { status: 429, headers: responseHeaders(limiterResponse!, { "Retry-After": String(result.retryAfterSeconds) }) });
    }
    if (result.kind === "invalid-credentials") return context.body(null, 401);

    context.header("Set-Cookie", `${SESSION_COOKIE}=${result.token}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict`);
    return context.body(null, 204);
  });

  app.get("/api/auth/session", async (context) => {
    const env = context.env;
    if (!secretsReady(env)) return context.body(null, 503);
    const valid = await hasValidSession(env.PASETO_KEY, readCookie(context.req.header("Cookie")));
    if (!valid) return context.body(null, 401);
    return context.json({ authenticated: true });
  });

  app.get("/api/content", async (context) => {
    const env = context.env;
    if (!secretsReady(env)) return context.body(null, 503);
    const valid = await hasValidSession(env.PASETO_KEY, readCookie(context.req.header("Cookie")));
    if (!valid) return context.body(null, 401);
    return context.json({
      heading: "Hello, world!",
      message: "SolidJS 앱이 Cloudflare Workers에서 실행 중입니다.",
    });
  });

  app.post("/api/auth/logout", async (context) => {
    if (!isSameOrigin(context.req.raw)) return context.body(null, 403);
    context.header("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
    return context.body(null, 204);
  });

  app.all("*", async (context) => {
    const path = context.req.path;
    if (path.startsWith("/api/")) return context.body(null, 404);
    if (context.req.method !== "GET" && context.req.method !== "HEAD") return context.body(null, 405);
    if (!context.env.ASSETS) return context.body(null, 503);

    if (PUBLIC_LOGIN_PATHS.has(path) || isPublicViteDevPath(path)) {
      return context.env.ASSETS.fetch(context.req.raw.clone());
    }

    const env = context.env;
    if (!secretsReady(env)) return context.body(null, 503);
    const valid = await hasValidSession(env.PASETO_KEY, readCookie(context.req.header("Cookie")));
    if (!valid) return context.body(null, 401);
    return context.env.ASSETS.fetch(context.req.raw.clone());
  });

  return app;
}
