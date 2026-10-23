export const uiElements = {
  button: "Button",
  passwordField: "PasswordField",
  card: "Card",
  status: "Status",
} as const;

export type UiElementName = (typeof uiElements)[keyof typeof uiElements];

export const uiCopy = {
  brand: "QUAIL",
  loginTitle: "로그인",
  loginIntro: "계속하려면 비밀번호를 입력해 주세요.",
  passwordLabel: "비밀번호",
  loginButton: "로그인",
  loggingIn: "확인 중…",
  logoutButton: "로그아웃",
  loggingOut: "처리 중…",
  checkingSession: "로그인 상태 확인 중…",
  loginSuccess: "로그인되었습니다.",
  invalidPassword: "비밀번호를 확인해 주세요.",
  sessionExpired: "세션이 만료되었습니다. 다시 로그인해 주세요.",
  protectedContentLoading: "보호된 내용을 불러오는 중…",
  protectedContentUnavailable: "보호된 내용을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.",
  logoutSuccess: "로그아웃되었습니다.",
  logoutFailed: "로그아웃할 수 없습니다. 다시 시도해 주세요.",
  sessionCheckFailed: "로그인 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  loginUnavailable: "로그인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
} as const;

export type UiCopyKey = keyof typeof uiCopy;

export function formatRetryAfter(seconds: number): string {
  return `${seconds}초 후 다시 시도해 주세요.`;
}