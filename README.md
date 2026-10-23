# Quail
> 메추라기 비가 내린다
- https://quail.qus0in.dev
- https://quail-solid-hello.qus0in.workers.dev

## Cloudflare secrets

Worker secret을 등록할 때 값을 명령에 포함하지 마세요.

~~~sh
pnpm exec wrangler secret put PASSWORD
node scripts/set-paseto-key.mjs
~~~

PASETO_KEY는 스크립트가 생성해 Worker에 등록합니다. 키 등록과 회전 안내는 [인증 문서](docs/authentication.md#configure-secrets)를 참고하세요.
