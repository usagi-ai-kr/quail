# 0011. Use Cloudflare Workers Builds for Git deployments

- Status: Accepted
- Date: 2026-10-24
- Related: [ADR-0002](0002-solidjs-앱을-cloudflare-workers에서-pnpm으로-운영.md)

## Context

ADR-0002 selects Cloudflare Workers and Wrangler for hosting and deployment. The user requested automatic deployments from GitHub pushes and reports completing the Cloudflare-side setup, including installing the Cloudflare Workers and Pages GitHub App. The native Workers Builds integration is the selected path. The connected repository, branch, and remote build settings have not been independently inspected, and no successful build has yet been verified.

## Decision

Use Cloudflare Workers Builds for automatic deployments from the connected GitHub repository. A push to its configured deployment branch is intended to trigger the native build and deployment. Do not add a duplicate GitHub Actions deployment workflow while native Workers Builds is configured. Keep the Worker target `quail-solid-hello` consistent with the checked-in Wrangler configuration. Record the first successful build separately; configuration setup alone is not deployment verification.

## Consequences

- Cloudflare owns the Git-connected build and deployment flow without a second deployment pipeline in GitHub Actions.
- The active branch and build settings live in Cloudflare and must be checked there; they cannot be inferred from this repository.
- The user reports setup completion, but the first build and deployment remain unverified.
- Required values remain Cloudflare Worker secrets. Local OAuth credentials are not deployment credentials, and secret values must never be recorded in the repository.

## Alternatives considered

- GitHub Actions deployment workflow: not selected because the user reports using native Workers Builds; adding Actions would duplicate the deployment path.
- Manual Wrangler deployment only: does not provide the requested automatic deployment on Git pushes.
