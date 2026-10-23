# 0001. Solid 앱에서 TypeScript 사용

- Status: Accepted
- Date: 2026-10-23

## Context

현재 SolidJS Hello World 앱은 JSX와 Vite 설정을 JavaScript로 작성한다. 빌드 과정에서 타입 검사를 하지 않아 앱과 도구 설정의 타입 오류를 일찍 발견하기 어렵다.

## Decision

현재 SolidJS 앱과 Vite 설정에 TypeScript를 사용한다. Solid 화면은 `.tsx`, Vite 설정은 `.ts`로 작성하며, Vite 빌드 전에 `tsc --noEmit`으로 타입을 검사한다.

## Consequences

- 앱과 Vite 설정에서 타입 오류를 빌드 단계에 발견할 수 있다.
- TypeScript와 `tsconfig.json`을 추가하고, 변경 시 타입 검사 오류를 해결해야 한다.
- 화면 구조, 동작, 스타일은 유지하면서 소스와 설정 파일 확장자를 TypeScript로 전환한다.

## Alternatives considered

- JavaScript를 유지한다: 초기 설정은 단순하지만 타입 검사와 정적 타입 정보가 없다.
- 앱만 TypeScript로 바꾸고 Vite 설정은 JavaScript로 둔다: 전환 범위는 줄지만 설정 파일은 타입 검사를 받지 않는다.
