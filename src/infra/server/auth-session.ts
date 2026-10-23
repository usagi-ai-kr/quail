import { decrypt, encrypt } from "paseto-ts/v4";

export const SESSION_COOKIE = "quail_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
const LOCAL_KEY_PATTERN = /^k4\.local\.[A-Za-z0-9_-]{43}$/;

export function isValidPasetoLocalKey(value: string | undefined): value is string {
  return value !== undefined && LOCAL_KEY_PATTERN.test(value);
}

export async function createSessionToken(key: string, now = Date.now()): Promise<string> {
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + SESSION_TTL_SECONDS * 1000).toISOString();
  return encrypt(key, { sub: "quail", iat: issuedAt, exp: expiresAt }, { addIat: false, addExp: false });
}

export async function hasValidSession(key: string, token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;

  try {
    const { payload } = await decrypt<{ sub?: unknown; exp?: unknown }>(key, token);
    return payload.sub === "quail" && typeof payload.exp === "string" && Date.parse(payload.exp) > now;
  } catch {
    return false;
  }
}
