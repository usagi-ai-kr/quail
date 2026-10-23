# UI glossary

Use the English component names and Korean terms below consistently. src/ui/content/ko.ts is the code-side copy source: add or revise strings there and update this table in the same change. Do not duplicate standard strings as literals in UI components or add a separate i18n package for this glossary.

## UI element names

| Code name (uiElements) | Korean term | Role | Standard copy keys | Implementation status |
|---|---|---|---|---|
| Button | 버튼 | Keyboard-accessible action with primary and secondary variants | Labels come from the caller, such as loginButton or logoutButton; pending labels use loggingIn or loggingOut | Shared component in src/ui/components/Button.tsx |
| PasswordField | 비밀번호 입력란 | Labeled, masked password entry with current-password autofill | passwordLabel; login feedback is announced through invalidPassword or another Status key | Shared component in src/ui/components/PasswordField.tsx |
| Card | 카드 | Semantic grouping for related content | No component-owned text key; content supplies its own keys | uiElements glossary name only; do not infer a standalone Card component |
| Status | 상태 안내 | Polite announcement for loading, login, session, and error feedback | checkingSession, loginSuccess, invalidPassword, sessionExpired, protectedContentLoading, protectedContentUnavailable, logoutSuccess, logoutFailed, sessionCheckFailed, loginUnavailable, or formatRetryAfter(seconds) | Use a semantic role=status region; do not infer a standalone Status component |

uiElements exports exactly button, passwordField, card, and status. Do not add names for unimplemented asset dashboards, Select, Dialog, MoneyField, or DataTable until those UI components are implemented.

## Standard Korean copy

These keys and values match the current uiCopy object in src/ui/content/ko.ts.

| Key | Korean copy |
|---|---|
| brand | QUAIL |
| loginTitle | 로그인 |
| loginIntro | 계속하려면 비밀번호를 입력해 주세요. |
| passwordLabel | 비밀번호 |
| loginButton | 로그인 |
| loggingIn | 확인 중… |
| logoutButton | 로그아웃 |
| loggingOut | 처리 중… |
| checkingSession | 로그인 상태 확인 중… |
| loginSuccess | 로그인되었습니다. |
| invalidPassword | 비밀번호를 확인해 주세요. |
| sessionExpired | 세션이 만료되었습니다. 다시 로그인해 주세요. |
| protectedContentLoading | 보호된 내용을 불러오는 중… |
| protectedContentUnavailable | 보호된 내용을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요. |
| logoutSuccess | 로그아웃되었습니다. |
| logoutFailed | 로그아웃할 수 없습니다. 다시 시도해 주세요. |
| sessionCheckFailed | 로그인 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요. |
| loginUnavailable | 로그인할 수 없습니다. 잠시 후 다시 시도해 주세요. |
| formatRetryAfter(seconds) | {seconds}초 후 다시 시도해 주세요. |

formatRetryAfter is the only current parameterized copy helper. Keep the number as data and use this formatter rather than building another localized string at the call site. Add new error-state phrases to uiCopy and this table together.
