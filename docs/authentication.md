# Authentication development and operations

This runbook records the selected contract. It does not claim that every route, scenario, deployment, or runtime check has passed. Use the commands below and report only checks that were actually run.

## Selected stack and boundaries

- Hono 4.13.13 handles the Cloudflare Worker API.
- paseto-ts 2.0.7 issues and verifies PASETO v4.local session tokens.
- ky 2.2.0 sends browser requests with retry disabled for authentication calls.
- The package ranges are ^4.13.13, ^2.0.7, and ^2.2.0 respectively; keep pnpm-lock.yaml aligned.
- Keep ui, app, domain, and infra separated. Prefer app-owned ports between UI/use cases and client adapters. Put Hono, Cloudflare bindings, secrets, PASETO, and Durable Object adapters under infra/server; browser ky adapters under infra/client. Only composition entries wire implementations. Never import server modules into browser code.

## API contract

| Request | Successful response | Relevant errors |
|---|---|---|
| POST /api/auth/login | 204; sets an eight-hour session cookie | 400 invalid or missing password body; 401 incorrect password; 403 missing or cross-origin Origin; 413 request body exceeds 1,024 bytes; 429 failure limit with Retry-After; 503 required secret or limiter unavailable |
| GET /api/auth/session | 200 with authenticated state | 401 absent, expired, or tampered token; 503 required verification secret missing |
| GET /api/content | 200 JSON `{ "heading": "Hello, world!", "message": "SolidJS 앱이 Cloudflare Workers에서 실행 중입니다." }` with a valid session | 401 absent, expired, or tampered token; 503 required verification secret missing |
| POST /api/auth/logout | 204; expires the session cookie | 403 missing or cross-origin Origin |

Login/session responses use Cache-Control: no-store. The session cookie is HttpOnly, Secure, SameSite=Strict, Path=/, and Max-Age=28800. Logout expires it with Max-Age=0. Never rely on a hidden route or login screen to protect Worker-served content; test direct requests for protected assets.

## Failed-password limit

The Durable Object tracks incorrect-password failures per client IP. It allows at most five failures in a fifteen-minute window. A successful login before the threshold clears prior failures. Once five failures have been recorded, every later login request returns 429 with Retry-After until the window expires, even if the submitted password is correct. The route must not issue a successful response or session token for that limited request. Do not claim that password comparison is skipped; the response policy is what the contract guarantees.

Retry-After reports seconds remaining in the active window; it is 900 seconds when the window has just started. The limiter serializes concurrent failures so concurrent requests cannot exceed the five-failure allowance. This is an IP limit: shared networks may affect multiple people, and changing IP addresses can bypass it. It is not per-user identity management.

The browser client must not retry login automatically. Configure ky with retry: {limit: 0} for auth requests and test that a 401, 429, 503, timeout, or network failure causes one client attempt. Show Retry-After to the user; do not automatically resubmit the password.

## Configure secrets

Run these commands from the project root. Wrangler prompts for each value; do not append values to commands or put them in shell history.

~~~sh
pnpm exec wrangler secret put PASSWORD
node scripts/set-paseto-key.mjs
~~~

The first command prompts for the shared PASSWORD; do not append the value to the command. The second command generates a PASERK `k4.local.<43-base64url-characters>` key and registers it as `PASETO_KEY` on Worker `quail-solid-hello` through Wrangler stdin. It does not print the generated key. Each run rotates the key and invalidates existing sessions. Do not derive the key from PASSWORD. Keep both values out of source, wrangler.jsonc vars, browser assets, client storage, logs, and test output.

For local development, create .dev.vars beside the Wrangler configuration and replace these placeholders with local-only values:

~~~dotenv
PASSWORD=<local-only-password>
PASETO_KEY=k4.local.<43-base64url-characters>
~~~

Replace the PASETO_KEY placeholder with a local-only PASERK key; the angle-bracket text above is not a valid key. The provisioning script above targets the Cloudflare Worker and does not create or print a local key. Use local values that differ from production. The repository ignores .dev.vars files; confirm with git check-ignore .dev.vars and never commit the file. Wrangler uses .dev.vars for local secrets; do not use both .dev.vars and .env for the same local environment.

Missing PASSWORD or PASETO_KEY must fail closed with 503 before limiter state changes. Never silently fall back to a default or an empty value.

Cloudflare references: [Worker secrets and local variables](https://developers.cloudflare.com/workers/local-development/environment-variables/) and [Hono on Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers). The [PASETO v4 specification](https://github.com/paseto-standard/paseto-spec/blob/master/docs/01-Protocol-Versions/Version4.md) requires a 256-bit key for v4.local.

## Runtime compatibility date

Set Wrangler compatibility_date to a date supported by the installed workerd runtime. The current installed runtime supports through 2026-10-19; the previously attempted 2026-10-23 is too new. Use 2026-10-19 (or another confirmed supported date), and advance it only after local dev startup succeeds with the installed runtime. Do not set a date ahead of the runtime based on the calendar.

Check the runtime after changing compatibility settings:

~~~sh
pnpm dev
pnpm typecheck
pnpm build
~~~

A successful typecheck/build does not prove dev-server startup works; report the dev result separately.

## BDD acceptance scenarios

Use Given/When/Then and observable response/status/header/state assertions. These are required scenarios, not claims that they have passed:

1. Given fewer than five failures, when the correct password is submitted, then login returns 204, sets the expected cookie, and clears the old failure count.
2. Given five incorrect passwords in an active window, when another request submits the correct password, then login still returns 429 with Retry-After and issues no session cookie.
3. Given concurrent incorrect-password requests from one IP, when the Durable Object records them, then at most five are admitted and the remainder receive 429 with positive Retry-After.
4. Given PASSWORD or PASETO_KEY is missing, when login is called, then it returns 503 before rate-limiter mutation and does not disclose configuration.
5. Given a missing, expired, or tampered token, when GET /api/auth/session is called, then it returns 401.
6. Given no session, when a protected asset path is requested directly, then it is denied; with a valid session it is served.
7. Given a missing or cross-origin Origin, when a state-changing route is called, then it returns 403.
8. Given a session cookie, when logout succeeds, then the response expires the cookie; document that a copied stateless token is not individually revocable unless a revocation store is implemented.
9. Given an auth response or network failure, when the ky client handles it, then it makes exactly one attempt.

## Run the checks

~~~sh
pnpm test
pnpm typecheck
pnpm build
~~~

For a focused Vitest scenario, pass its path after the test script separator. The layer checker validates supported relative imports only. It does not resolve path aliases, computed imports, or external framework/package imports; use typecheck, build, and source review for those boundaries. A checker result alone is not an auth security review.

## Logout and rotation

Logout clears the browser cookie. With stateless PASETO sessions, a copied token may remain valid until its eight-hour expiry unless a server-side revocation mechanism is added.

Changing PASSWORD affects future login attempts but does not invalidate already issued tokens. Rotating PASETO_KEY makes existing sessions fail verification and requires users to log in again. To revoke all sessions immediately, update the key through Wrangler; never publish the new value in a command, issue, or log.
