import { beforeEach, describe, expect, it } from "vitest";
import { encrypt } from "paseto-ts/v4";
import { createAuthApp } from "../../src/infra/server/app";

const TEST_PASSWORD = "test-only-password";
const TEST_KEY = "k4.local.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

class FakeRateLimitNamespace {
  readonly calls: Array<{ clientId: string; success: boolean }> = [];
  blocked = false;
  unavailable = false;
  idFromName(name: string) { return name; }
  get(clientId: string) {
    return {
      fetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { success: boolean };
        this.calls.push({ clientId, success: body.success });
        if (this.unavailable) throw new Error("test-only DO outage");
        return this.blocked
          ? Response.json({ allowed: false }, { status: 429, headers: { "Retry-After": "900" } })
          : Response.json({ allowed: true });
      },
    };
  }
}

const assetFetcher = { fetch: async (request: Request) => new Response(`asset:${new URL(request.url).pathname}`) };
let limiter: FakeRateLimitNamespace;
let app: ReturnType<typeof createAuthApp>;

function bindings(overrides: Record<string, unknown> = {}) {
  return {
    PASSWORD: TEST_PASSWORD,
    PASETO_KEY: TEST_KEY,
    AUTH_RATE_LIMITER: limiter,
    ASSETS: assetFetcher,
    ...overrides,
  } as never;
}

function apiRequest(path: string, init: RequestInit = {}, extraHeaders: HeadersInit = {}) {
  const headers = new Headers(init.headers);
  new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  return app.request(`https://quail.test${path}`, { ...init, headers }, bindings());
}

function sameOriginPost(path: string, password?: string) {
  return apiRequest(path, {
    method: "POST",
    headers: { Origin: "https://quail.test", "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.9" },
    body: JSON.stringify(password === undefined ? {} : { password }),
  });
}

function sessionRequest(cookie: string) {
  return apiRequest("/api/auth/session", { headers: { Cookie: cookie } });
}

function cookieValue(setCookie: string) {
  return setCookie.split(";")[0].split("=").slice(1).join("=");
}

beforeEach(() => {
  limiter = new FakeRateLimitNamespace();
  app = createAuthApp();
});

describe("password authentication API", () => {
  it("Given the configured password, When POST /api/auth/login is called same-origin, Then it sets an eight-hour secure session cookie", async () => {
    const response = await sameOriginPost("/api/auth/login", TEST_PASSWORD);
    const cookie = response.headers.get("Set-Cookie") ?? "";

    expect(response.status).toBe(204);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=28800");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("Given an incorrect password, When login is called, Then it returns a generic 401", async () => {
    const response = await sameOriginPost("/api/auth/login", "incorrect");
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("");
    expect(limiter.calls).toHaveLength(1);
    expect(limiter.calls[0]?.success).toBe(false);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("Given missing PASSWORD or PASETO_KEY, When login is called, Then it fails closed with 503 before rate limiting", async () => {
    for (const missing of ["PASSWORD", "PASETO_KEY"]) {
      const env = bindings({ [missing]: undefined });
      const response = await app.request("https://quail.test/api/auth/login", {
        method: "POST", headers: { Origin: "https://quail.test", "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.9" },
        body: JSON.stringify({ password: TEST_PASSWORD }),
      }, env);
      expect(response.status).toBe(503);
    }
    expect(limiter.calls).toHaveLength(0);
  });

  it("Given a missing password field, When login is called, Then it returns 400", async () => {
    const response = await sameOriginPost("/api/auth/login");
    expect(response.status).toBe(400);
  });

  it("Given an oversized body, When login is called, Then it rejects the body even without Content-Length", async () => {
    const response = await sameOriginPost("/api/auth/login", "x".repeat(1024));
    expect(response.status).toBe(413);
  });

  it("Given an unavailable Durable Object, When login is called, Then it fails closed with 503 and no-store", async () => {
    limiter.unavailable = true;
    const response = await sameOriginPost("/api/auth/login", "incorrect");
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("Given a cross-origin or missing Origin header, When a state-changing request is sent, Then it returns 403", async () => {
    const mismatch = await app.request("https://quail.test/api/auth/login", {
      method: "POST", headers: { Origin: "https://attacker.test", "Content-Type": "application/json" },
      body: JSON.stringify({ password: TEST_PASSWORD }),
    }, bindings());
    const missing = await app.request("https://quail.test/api/auth/logout", { method: "POST" }, bindings());
    expect(mismatch.status).toBe(403);
    expect(missing.status).toBe(403);
  });

  it("Given the retry limit is exhausted, When login is called, Then it returns 429 and Retry-After", async () => {
    limiter.blocked = true;
    const response = await sameOriginPost("/api/auth/login", "incorrect");
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("900");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("Given the retry limit is exhausted, When the correct password is submitted before the window expires, Then it still returns 429", async () => {
    limiter.blocked = true;
    const response = await sameOriginPost("/api/auth/login", TEST_PASSWORD);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("900");
    expect(limiter.calls).toHaveLength(1);
    expect(limiter.calls[0]?.clientId).toMatch(/^[0-9a-f]{64}$/);
    expect(limiter.calls[0]?.success).toBe(true);
  });

  it("Given a valid session cookie, When GET /api/auth/session is called, Then it returns authenticated state", async () => {
    const login = await sameOriginPost("/api/auth/login", TEST_PASSWORD);
    const cookie = `quail_session=${cookieValue(login.headers.get("Set-Cookie") ?? "")}`;
    const response = await sessionRequest(cookie);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: true });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("Given no session, When protected content is requested, Then the API refuses access", async () => {
    const response = await app.request("https://quail.test/api/content", {}, bindings());
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("Given a valid session cookie, When protected content is requested, Then the server returns the Hello content", async () => {
    const login = await sameOriginPost("/api/auth/login", TEST_PASSWORD);
    const cookie = `quail_session=${cookieValue(login.headers.get("Set-Cookie") ?? "")}`;
    const response = await app.request("https://quail.test/api/content", { headers: { Cookie: cookie } }, bindings());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      heading: "Hello, world!",
      message: "SolidJS 앱이 Cloudflare Workers에서 실행 중입니다.",
    });
  });

  it("Given missing, tampered, or expired token, When GET /api/auth/session is called, Then it returns 401", async () => {
    const missing = await sessionRequest("");
    const login = await sameOriginPost("/api/auth/login", TEST_PASSWORD);
    const original = cookieValue(login.headers.get("Set-Cookie") ?? "");
    const tamperIndex = Math.floor(original.length / 2);
    const tampered = `${original.slice(0, tamperIndex)}${original[tamperIndex] === "a" ? "b" : "a"}${original.slice(tamperIndex + 1)}`;
    const invalid = await sessionRequest(`quail_session=${tampered}`);
    const expired = await encrypt(TEST_KEY, { sub: "quail", exp: "2000-01-01T00:00:00.000Z" }, { addIat: false, addExp: false, validatePayload: false });
    const expiredResponse = await sessionRequest(`quail_session=${expired}`);
    expect([missing.status, invalid.status, expiredResponse.status]).toEqual([401, 401, 401]);
  });

  it("Given a public login asset and a protected direct asset, When unauthenticated paths are requested, Then only the login allowlist is served", async () => {
    const loginAsset = await app.request("https://quail.test/assets/login.js", {}, bindings());
    const unknownBundle = await app.request("https://quail.test/assets/other-chunk.js", {}, bindings());
    const protectedAsset = await app.request("https://quail.test/private/report.json", {}, bindings());
    expect(loginAsset.status).toBe(200);
    expect(unknownBundle.status).toBe(401);
    expect(protectedAsset.status).toBe(401);
  });

  it("Given an authenticated session, When a protected asset is requested directly, Then the asset binding serves it", async () => {
    const login = await sameOriginPost("/api/auth/login", TEST_PASSWORD);
    const cookie = `quail_session=${cookieValue(login.headers.get("Set-Cookie") ?? "")}`;
    const response = await app.request("https://quail.test/private/report.json", { headers: { Cookie: cookie } }, bindings());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("asset:/private/report.json");
  });

  it("Given a valid session, When logout is called same-origin, Then the cookie is cleared", async () => {
    const response = await app.request("https://quail.test/api/auth/logout", { method: "POST", headers: { Origin: "https://quail.test" } }, bindings());
    expect(response.status).toBe(204);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
