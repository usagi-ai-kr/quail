# 0003. Workers 사용자 지정 도메인 연결

- Status: Accepted
- Date: 2026-10-23

## Context

앱은 `quail-solid-hello.qus0in.workers.dev`에서 동작한다. 사용자가 앱을 `quail.qus0in.dev`로 연결하도록 요청했고, 기존 `workers.dev` 주소도 계속 사용할 수 있다.

## Decision

Wrangler에 `quail.qus0in.dev`를 `custom_domain: true`인 Custom Domain으로 등록하고 `workers_dev: true`를 유지한다.

## Consequences

- Cloudflare가 사용자 지정 호스트의 DNS 레코드와 TLS 인증서를 관리한다.
- 사용자 지정 호스트의 모든 경로가 이 Worker로 전달된다.
- 앱은 사용자 지정 도메인과 기존 `workers.dev` 주소에서 모두 접근 가능하다.
- 도메인 연결 상태는 `wrangler.jsonc`에서 관리하고 Wrangler로 배포한다.

## Alternatives considered

- `workers.dev` 주소만 사용: 사용자가 지정한 도메인을 제공하지 못한다.
- DNS와 TLS를 별도로 구성하는 일반 Worker route: Worker가 호스트의 원본이므로 Cloudflare Custom Domain이 더 단순하다.
