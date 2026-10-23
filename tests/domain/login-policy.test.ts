import { describe, expect, it } from "vitest";
import { decideLoginAttempt, MAX_FAILED_ATTEMPTS, RATE_LIMIT_WINDOW_MS } from "../../src/domain/login-policy";

describe("login retry policy", () => {
  it("Given five failures inside fifteen minutes, When another wrong password arrives, Then it is blocked with remaining seconds", () => {
    const now = 1_000_000;
    const state = { failedAttempts: 5, resetAt: now + RATE_LIMIT_WINDOW_MS };
    const result = decideLoginAttempt(state, now, false);

    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(900);
    expect(result.state).toEqual(state);
  });

  it("Given an expired window, When a wrong password arrives, Then a new window starts", () => {
    const now = 2_000_000;
    const result = decideLoginAttempt({ failedAttempts: 5, resetAt: now - 1 }, now, false);

    expect(result.allowed).toBe(true);
    expect(result.state).toEqual({ failedAttempts: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  });

  it("Given a valid password, When the attempt is recorded, Then previous failures are cleared", () => {
    const result = decideLoginAttempt({ failedAttempts: 4, resetAt: 3_000_000 }, 2_000_000, true);
    expect(result.allowed).toBe(true);
    expect(result.state).toBeNull();
  });

  it("Given five failures in an active window, When the correct password arrives, Then it remains blocked until expiry", () => {
    const now = 1_000_000;
    const state = { failedAttempts: 5, resetAt: now + RATE_LIMIT_WINDOW_MS };
    const result = decideLoginAttempt(state, now, true);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(900);
    expect(result.state).toEqual(state);
  });
});
