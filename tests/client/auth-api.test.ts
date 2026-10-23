import { describe, expect, it } from "vitest";
import { createAuthClient } from "../../src/infra/client/auth-api";

describe("ky authentication client", () => {
  it("Given a transient server error, When the session API is called, Then ky does not retry", async () => {
    let calls = 0;
    const client = createAuthClient(async () => {
      calls += 1;
      return new Response("unavailable", { status: 503 });
    });

    expect(await client.getSession()).toEqual({ authenticated: false, reason: "unavailable" });
    expect(calls).toBe(1);
  });

  it("Given a rate limited login response, When the infra adapter handles it, Then it returns a typed result with Retry-After", async () => {
    const client = createAuthClient(async () => new Response(null, { status: 429, headers: { "Retry-After": "37" } }));

    expect(await client.login("test-password")).toEqual({ ok: false, reason: "rate-limited", retryAfterSeconds: 37 });
  });
});
