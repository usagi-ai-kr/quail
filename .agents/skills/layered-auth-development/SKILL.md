---
name: layered-auth-development
description: "Design, build, or review layered application changes with BDD/TDD, dependency-boundary checks, and SemVer. Use for authentication features and security fixes, or broader ui/app/domain/infra architecture and test/release work."
---

# Layered Application and Authentication Development

Use this skill for authentication work and for application changes that need explicit layer boundaries, behavior-first tests, or release-version decisions.

## Workflow

1. Read the current source tree, package manifest, TypeScript configuration, test setup, and applicable ADRs. Follow existing names where they fit. When no layer structure exists, use the convention below and document any necessary exception.
2. Write observable Given/When/Then acceptance cases before implementation. Include normal behavior, denial behavior, failure modes, and relevant concurrency.
3. Add a test that fails for the intended reason. Record the exact command and actual failure output. Implement the smallest change, run the targeted test, then refactor and run the relevant regression suite. Never invent a red or green result.
4. Keep application policy in domain, use cases and ports in app, UI input/rendering in ui, and platform adapters in infra. Run the layer checker and test both allowed and forbidden imports.
5. Review the security boundary, operational instructions, dependency ranges, and SemVer impact. Update the authentication runbook and ADR only when their recorded contract or decisions change.
6. Report changed paths, commands actually run, red/green evidence, unrun checks, and known limits.

## Layer and runtime boundaries

When no existing structure exists, use:

- src/ui: browser screens, forms, and presentation.
- src/app: use cases, orchestration, and ports. App depends on domain.
- src/domain: pure policies and domain types. Domain has no framework, HTTP, storage, environment, or other-layer imports.
- src/infra/server: Hono routes, Cloudflare bindings, secret access, PASETO, Durable Object adapters, and server composition.
- src/infra/client: browser HTTP adapters such as ky.

Allowed dependencies are ui to app, app to domain, and infra adapters to their app ports or domain contracts. Infra implements ports; it never becomes an app dependency. Type-only imports and re-exports are dependencies and obey the same rules. Test files are outside production layer checks; checker fixtures still cover type imports, re-exports, dynamic imports, aliases, and test-file exclusions.

The browser entry may compose ui, app, and infra/client. A module under ui may import infra/client only when it is the explicitly named composition entry; ordinary UI modules should use app use cases and app-owned client ports. No browser entry, ui, app, domain, or infra/client module may import infra/server, including type-only imports. Keep server and client adapters separate so secrets and server dependencies cannot enter the browser bundle. Composition wires implementations to ports without reversing the dependency direction.

Run the deterministic standard-library checker from the repository root:

~~~sh
python3 .agents/skills/layered-auth-development/scripts/check_layer_imports.py --root .
python3 -m unittest discover -s .agents/skills/layered-auth-development/tests -v
~~~

The checker validates local TypeScript/JavaScript imports in src. It counts value imports, type-only imports, re-exports, dynamic imports, and CommonJS requires. It excludes test/spec files and test directories from production dependency checks. It checks relative imports only; path aliases, computed imports, and external framework/package dependencies are outside its scope. Typecheck, build, and source review must cover those boundaries separately.

## Password authentication contract

- Hono 4.13.13 owns the Worker API. Use PASETO v4.local sessions with paseto-ts 2.0.7. Use ky 2.2.0 for browser requests. Declare compatible stable ranges and commit the lockfile.
- Routes: POST /api/auth/login, GET /api/auth/session, and POST /api/auth/logout.
- PASSWORD and PASETO_KEY are server-only Cloudflare secrets. Missing required secrets fail closed with 503 before authentication or retry-state mutation. Never put their values in source, Wrangler vars, browser assets, client storage, test output, or logs.
- Track incorrect-password failures per client IP in a Durable Object: five failures in a fifteen-minute window. A correct password before the threshold clears prior failures. Once five failures are recorded, every later login attempt, including a correct password, returns 429 with Retry-After until that window expires. A new expired window starts with the next incorrect password.
- A successful login returns 204 and sets an eight-hour HttpOnly, Secure, SameSite=Strict, Path=/ cookie. Session lookup returns 200 with authenticated state on a valid token and 401 for absent, expired, or tampered tokens. Logout returns 204 and expires the cookie. State and login responses use no-store; state-changing routes reject missing or cross-origin Origin with 403.
- Protect Worker-served content at the server boundary, including direct asset requests. A login screen or hidden browser route is not authorization. Permit only an explicit public login-asset allowlist.
- Set ky retry to zero for authentication calls, for example retry: {limit: 0}. A 401, 429, 503, timeout, or ambiguous transport failure must not resubmit a password automatically.

The rate limit is per IP, not per person. Shared networks can affect multiple users; changing IP can bypass the limit. Do not describe this gate as individual identity or account lockout.

## Security and regression coverage

Include Given/When/Then cases for:

- Correct login sets the expected cookie attributes and no-store response; a valid session is recognized.
- Wrong password yields a generic 401 and increments only that IP failure count.
- Five recorded failures cause the next request to return 429 with Retry-After, even when that next password is correct. No authenticated response or session token is issued while the window is active, even when the submitted password is correct.
- Successful login before the threshold clears previous failures. An expired window starts a fresh counter.
- Missing PASSWORD or PASETO_KEY returns 503 before touching the limiter; never echo configuration values.
- Missing, expired, and tampered PASETO tokens are rejected. Direct protected-asset access without a session is denied; authenticated access is allowed.
- Cross-origin and missing-Origin state-changing requests are rejected. Logout expires the cookie.
- Concurrent wrong-password requests for one IP admit no more than five failures; the rest receive 429 and a positive Retry-After.
- Authentication requests use one client attempt even for 429, 503, network failure, or timeout.

Prefer tests at domain-policy, Durable Object concurrency, Hono request/response, and browser-client boundaries. Keep test credentials synthetic and local. Do not use real secrets in fixtures.

## BDD and TDD evidence

Write acceptance cases as Given / When / Then statements with observable status, headers, state, and response behavior. Use this cycle:

1. Add the scenario and focused assertion.
2. Run it before implementation; capture the real failing output.
3. Implement the smallest behavior that satisfies it.
4. Run the focused test and related security regression tests.
5. Refactor only after green, then rerun affected tests.

Test authorization and boundaries directly, not just the visible login page. Add a regression whenever a security, failure, or concurrency bug is fixed. Report skipped tests and environmental blockers; never call a scenario verified unless it was run.

## SemVer and dependencies

The first functional authentication release is 0.1.0. Before 1.0.0, use minor versions for planned feature increments and patch versions for compatible fixes; identify any breaking behavior explicitly. After 1.0.0, follow SemVer: patch for compatible fixes, minor for backward-compatible functionality, and major for incompatible public behavior or API changes.

Use stable dependency versions compatible with the code and environment: Hono ^4.13.13, ky ^2.2.0, and paseto-ts ^2.0.7. Keep pnpm-lock.yaml in sync. Do not use prereleases for these direct dependencies. Treat a library upgrade as security-sensitive when it affects token validation, cookie handling, retries, routing, or Worker bindings.
