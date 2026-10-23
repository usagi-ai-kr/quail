# Deployment

## Automatic deployment

The selected path is Cloudflare's native Workers Builds integration with the GitHub repository. The user reports that they completed the automatic-deployment setup and confirmed installation of the Cloudflare Workers and Pages GitHub App. Pushed commits to the connected deployment branch are intended to trigger Cloudflare's build and deployment. Do not add a duplicate GitHub Actions deployment workflow while this integration is in use.

The repository connection, selected branch, and remote build settings have not been independently inspected. The first successful build and deployment have not been verified, so setup completion must not be reported as a successful deployment. The deployment target in the checked-in Wrangler configuration is `quail-solid-hello`; remote dashboard values are not inferred from local files.

## Secrets and verification state

Worker secrets are managed in Cloudflare, not committed to the repository or copied from local OAuth credentials. An earlier P1 inspection found no registered Worker secrets and no GitHub repository secrets; recheck Worker secret names before runtime authentication verification. Never print or record secret values. The `PASSWORD` secret is entered through Wrangler's prompt. `node scripts/set-paseto-key.mjs` generates and registers `PASETO_KEY` directly on `quail-solid-hello` without printing the key; running it again rotates the key and invalidates existing sessions. See [authentication operations](authentication.md#configure-secrets) for the key contract and secret handling.

Runtime authentication validation is pending until the required Worker secrets are present and a deployment completes successfully. Local Wrangler OAuth authentication does not establish the GitHub-to-Cloudflare deployment connection.
