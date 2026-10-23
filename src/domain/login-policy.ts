export const MAX_FAILED_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export interface FailureState {
  failedAttempts: number;
  resetAt: number;
}

export interface LoginAttemptDecision {
  allowed: boolean;
  retryAfterSeconds: number;
  state: FailureState | null;
}

/** Apply the fifteen-minute failure window. A locked window rejects even a correct password. */
export function decideLoginAttempt(
  state: FailureState | null,
  now: number,
  passwordMatches: boolean,
): LoginAttemptDecision {
  if (state && now < state.resetAt && state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
      state,
    };
  }

  if (passwordMatches) {
    return { allowed: true, retryAfterSeconds: 0, state: null };
  }

  if (!state || now >= state.resetAt) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      state: { failedAttempts: 1, resetAt: now + RATE_LIMIT_WINDOW_MS },
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    state: { failedAttempts: state.failedAttempts + 1, resetAt: state.resetAt },
  };
}

/** Compare strings without returning early on the first differing character. */
export function passwordsMatch(candidate: string, expected: string): boolean {
  const left = new TextEncoder().encode(candidate);
  const right = new TextEncoder().encode(expected);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return difference === 0;
}
