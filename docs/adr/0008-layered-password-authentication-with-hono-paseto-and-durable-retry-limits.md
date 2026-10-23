# 0008. Layered password authentication with Hono, PASETO, and durable retry limits

- Status: Accepted
- Date: 2026-10-24

## Context

The user selected shared-password access, Hono, PASETO, ky, ui/app/domain/infra layers, BDD/TDD, and SemVer. The current application is a SolidJS site served through Cloudflare Workers. Authentication must be enforced at the Worker boundary; browser-only checks do not protect direct asset requests.

The selected stable direct dependency versions are Hono 4.13.13, ky 2.2.0, and paseto-ts 2.0.7. The application package uses compatible SemVer ranges with a pnpm lockfile.

## Decision

Use Hono 4.13.13 for the Worker API, PASETO v4.local sessions through paseto-ts 2.0.7, and ky 2.2.0 for browser requests. Configure PASSWORD and PASETO_KEY as server-only Cloudflare secrets. Missing required secrets fail closed with 503 before limiter state changes. Never expose secret values in source, browser assets, client storage, or logs.

Expose POST /api/auth/login, GET /api/auth/session, and POST /api/auth/logout. Login returns 204 and an eight-hour HttpOnly, Secure, SameSite=Strict, Path=/ cookie on success; incorrect passwords return generic 401, malformed login input returns 400, missing or cross-origin Origin on state-changing requests returns 403, exhausted retry state returns 429 with Retry-After, and missing required secrets return 503. Session lookup returns 200 for a valid token and 401 for absent, expired, or tampered tokens. Logout returns 204 and expires the cookie. Authentication responses are no-store.

A Durable Object tracks incorrect-password failures by client IP for a fifteen-minute window. Five failures exhaust the window. A correct password before the threshold clears the failure count. After five failures, every later login request returns 429 with Retry-After until expiry, including a request with the correct password; the route issues no authenticated response or session token for that request. Concurrent attempts are serialized. Do not assert that password comparison is skipped.

Separate src/ui, src/app, src/domain, src/infra/server, and src/infra/client. Domain contains pure policy; app contains use cases and ports; infra implements adapters and composition. Browser UI must not import server modules. Client adapters may implement app-owned ports, including src/app/auth-client.ts. A browser composition entry may wire ui/app/client adapters. Type-only imports remain dependencies. Protect content with Worker-side asset routing and test direct paths.

Begin with Given/When/Then acceptance scenarios and failing tests; implement the smallest passing change, then refactor. Record actual red/green evidence honestly. Cover bad passwords, counter reset after success, a correct password after five failures returning 429, expiry, token expiration/tampering, direct asset access, Origin checks, missing secrets, and concurrent requests. Authentication ky calls use retry limit zero.

Release the first functional authentication feature as 0.1.0. Use stable compatible SemVer ranges: hono ^4.13.13, ky ^2.2.0, paseto-ts ^2.0.7. Keep pnpm-lock.yaml aligned.

For Wrangler compatibility_date, use a date accepted by the installed workerd runtime. The current installed runtime supports through 2026-10-19; do not set a later date until local dev startup confirms the runtime supports it.

## Consequences

- Authentication and failure counts stay server-side and survive Worker instance changes.
- An IP limit affects users sharing a network and does not stop IP rotation; this is a shared-password gate, not per-user identity management.
- Durable Objects add binding, migration, and storage/runtime cost; in-memory counters do not enforce a distributed limit.
- Changing PASSWORD does not invalidate sessions already issued. Rotating PASETO_KEY invalidates all existing tokens.
- Logout expires the browser cookie. A copied stateless token remains usable until expiry unless a token-revocation mechanism is added.
- The checker covers supported relative local imports. Aliases and external framework dependencies require separate typecheck, build, and source review.

## Alternatives considered

- Browser-only password comparison: exposes credentials and permits direct access.
- Worker-local or browser counters: reset or diverge across instances and clients.
- JWT and fetch directly: technically viable, but the user selected PASETO and ky.
- Cloudflare Access: provides managed identity policies, but differs from the requested shared-password flow.
