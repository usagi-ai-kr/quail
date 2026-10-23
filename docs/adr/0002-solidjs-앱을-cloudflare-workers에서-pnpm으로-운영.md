# 0002. SolidJS 앱을 Cloudflare Workers에서 pnpm으로 운영

- Status: Accepted
- Date: 2026-10-23

## Context

프로젝트는 SolidJS Hello World 앱으로 시작하며 요구사항은 Cloudflare Workers에서 동작하고 pnpm과 Wrangler로 배포하는 것이다. SSR, API, 저장소 같은 서버 기능은 현재 범위에 없다.

## Decision

앱을 Vite 기반 클라이언트 렌더링 SolidJS SPA로 운영한다. `@cloudflare/vite-plugin`으로 Workers 정적 자산을 빌드하고, pnpm으로 의존성을 관리하며 Wrangler로 배포한다. 현재 코드와 설정은 TypeScript를 사용하며 그 결정은 [ADR-0001](0001-solid-앱에서-typescript-사용.md)에 기록한다.

## Consequences

- 앱은 Workers의 정적 자산으로 배포되고 별도 SSR 서버가 필요하지 않다.
- Vite가 개발·빌드를 맡고 Wrangler 설정이 배포 대상과 경로를 관리한다.
- SSR 또는 API가 필요해지면 Worker 엔트리와 실행 구성을 별도로 결정해야 한다.

## Alternatives considered

- SolidStart SSR: 현재 Hello World 범위에 서버 렌더링 기능이 필요하지 않아 선택하지 않았다.
- Cloudflare Pages: 사용자가 Workers와 Wrangler 배포를 지정해 선택하지 않았다.
- npm 또는 Yarn: 사용자가 pnpm을 지정해 선택하지 않았다.
