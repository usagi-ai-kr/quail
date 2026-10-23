import { passwordsMatch } from "../domain/login-policy";

export type LoginResult =
  | { kind: "rate-limited"; retryAfterSeconds: number }
  | { kind: "invalid-credentials" }
  | { kind: "authenticated"; token: string };

export interface AttemptResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface LoginDependencies {
  recordAttempt(passwordMatches: boolean): Promise<AttemptResult>;
  issueSession(): Promise<string>;
}

/** Coordinate credential checking, the atomic retry policy, and session creation. */
export async function login(
  candidate: string,
  expected: string,
  dependencies: LoginDependencies,
): Promise<LoginResult> {
  const matched = passwordsMatch(candidate, expected);
  const attempt = await dependencies.recordAttempt(matched);

  if (!attempt.allowed) {
    return { kind: "rate-limited", retryAfterSeconds: attempt.retryAfterSeconds };
  }

  if (!matched) {
    return { kind: "invalid-credentials" };
  }

  return { kind: "authenticated", token: await dependencies.issueSession() };
}
