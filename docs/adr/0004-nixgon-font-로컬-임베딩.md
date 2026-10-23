# 0004. Nixgon Font 로컬 임베딩

- Status: Superseded
- Date: 2026-10-23
- Superseded by: [ADR-0013](0013-adopt-pretendard-for-ui-font.md)

## Context

사용자가 NixgonFont의 Light, Medium, Bold WOFF 파일을 제공하고 앱에 폰트를 내장하도록 요청했다. 외부 jsDelivr 주소를 계속 사용하면 브라우저가 폰트를 로드할 때 외부 CDN에 의존한다.

## Decision

`projectnoonnu/noonfonts_six@1.2`의 세 WOFF 파일을 `public/fonts/`에 포함하고 CSS `@font-face`에서 로컬 경로로 불러온다. Light, Medium, Bold를 각각 300, 500, 700으로 매핑하고 NixgonFont를 전역 기본 글꼴로 사용한다.

## Consequences

- 페이지와 폰트 파일이 모두 Cloudflare Workers 정적 자산으로 제공되어 브라우저가 jsDelivr에 요청하지 않는다.
- 세 파일 약 0.98 MB가 배포 자산에 포함된다.
- 폰트 소스와 웹 임베딩 사용 조건을 보존하고 폰트 파일 자체를 재판매하지 않는다.

## Alternatives considered

- jsDelivr에서 계속 로드: 앱의 배포 자산은 작아지지만 런타임에 외부 CDN 연결이 필요하다.
- 시스템 기본 글꼴 사용: 별도 파일 없이 동작하지만 사용자가 지정한 Nixgon 서체를 제공하지 못한다.

## Source and usage

- [Nixgon Font on Noonnu](https://noonnu.cc/en/font_page/219) — 웹사이트 임베딩 허용, 폰트 파일 자체 재판매 금지로 안내한다.
- [Nixgon Light WOFF](https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/NIXGONL-Vb.woff)
- [Nixgon Medium WOFF](https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/NIXGONM-Vb.woff)
- [Nixgon Bold WOFF](https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/NIXGONB-Vb.woff)
