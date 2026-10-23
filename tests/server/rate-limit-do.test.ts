import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("Durable Object retry limiter", () => {
  it("Given concurrent wrong-password attempts for one IP, When recorded atomically, Then only five are admitted and the rest receive Retry-After", async () => {
    const id = env.AUTH_RATE_LIMITER.idFromName(`test-${crypto.randomUUID()}`);
    const stub = env.AUTH_RATE_LIMITER.get(id);
    const responses = await Promise.all(Array.from({ length: 24 }, () => stub.fetch("https://limiter/attempt", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: false }),
    })));

    expect(responses.filter((response) => response.status === 200)).toHaveLength(5);
    const limited = responses.filter((response) => response.status === 429);
    expect(limited).toHaveLength(19);
    expect(limited.every((response) => Number(response.headers.get("Retry-After")) > 0)).toBe(true);

    const correctPasswordDuringLock = await stub.fetch("https://limiter/attempt", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: true }),
    });
    expect(correctPasswordDuringLock.status).toBe(429);
    expect(Number(correctPasswordDuringLock.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("Given failures followed by a correct password before the limit, When recorded, Then it clears the failure state", async () => {
    const id = env.AUTH_RATE_LIMITER.idFromName(`reset-${crypto.randomUUID()}`);
    const stub = env.AUTH_RATE_LIMITER.get(id);
    const request = (success: boolean) => stub.fetch("https://limiter/attempt", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success }),
    });

    expect((await request(false)).status).toBe(200);
    expect((await request(false)).status).toBe(200);
    expect((await request(true)).status).toBe(200);
    for (let index = 0; index < 5; index += 1) expect((await request(false)).status).toBe(200);
    expect((await request(false)).status).toBe(429);
  });
});
