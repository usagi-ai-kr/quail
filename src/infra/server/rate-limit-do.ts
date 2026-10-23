import { decideLoginAttempt, type FailureState } from "../../domain/login-policy";

interface RateLimitTransaction {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
}

interface RateLimitState {
  storage: {
    transaction<T>(closure: (transaction: RateLimitTransaction) => Promise<T>): Promise<T>;
  };
}

interface AttemptPayload {
  success?: unknown;
}

const STATE_KEY = "login-failures";

/** Stores each client's failure window inside a single Durable Object transaction. */
export class AuthRateLimitDurableObject {
  constructor(private readonly state: RateLimitState) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/attempt") {
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    let body: AttemptPayload;
    try {
      body = await request.json() as AttemptPayload;
    } catch {
      return Response.json({ error: "invalid_request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (typeof body.success !== "boolean") {
      return Response.json({ error: "invalid_request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const now = Date.now();
    const decision = await this.state.storage.transaction(async (transaction) => {
      const previous = await transaction.get<FailureState>(STATE_KEY) ?? null;
      const next = decideLoginAttempt(previous, now, body.success as boolean);
      if (next.state) await transaction.put(STATE_KEY, next.state);
      else await transaction.delete(STATE_KEY);
      return next;
    });

    if (!decision.allowed) {
      return Response.json({ allowed: false }, {
        status: 429,
        headers: { "Retry-After": String(decision.retryAfterSeconds), "Cache-Control": "no-store" },
      });
    }

    return Response.json({ allowed: true }, { headers: { "Cache-Control": "no-store" } });
  }
}
