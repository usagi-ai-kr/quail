import { createSignal, onMount, Show } from "solid-js";
import type { AuthClient, ProtectedContent } from "../app/auth-client";

export default function LoginPage(props: { client: AuthClient }) {
  const [authenticated, setAuthenticated] = createSignal(false);
  const [checking, setChecking] = createSignal(true);
  const [submitting, setSubmitting] = createSignal(false);
  const [password, setPassword] = createSignal("");
  const [status, setStatus] = createSignal("");
  const [content, setContent] = createSignal<ProtectedContent | null>(null);

  async function loadProtectedContent() {
    const result = await props.client.getProtectedContent();
    if (result.ok) {
      setContent(result.content);
    } else if (result.reason === "unauthenticated") {
      setAuthenticated(false);
      setContent(null);
      setStatus("세션이 만료되었습니다. 다시 로그인해 주세요.");
    } else {
      setStatus("보호된 내용을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  onMount(async () => {
    try {
      const result = await props.client.getSession();
      if (result.authenticated) {
        setAuthenticated(true);
        await loadProtectedContent();
      } else if (result.reason === "unavailable") {
        setStatus("로그인 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setChecking(false);
    }
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    try {
      const result = await props.client.login(password());
      if (result.ok) {
        setPassword("");
        setAuthenticated(true);
        setStatus("로그인되었습니다.");
        await loadProtectedContent();
      } else if (result.reason === "invalid-password") {
        setStatus("비밀번호를 확인해 주세요.");
      } else if (result.reason === "rate-limited") {
        const seconds = result.retryAfterSeconds ?? 0;
        setStatus(seconds > 0 ? `${seconds}초 후 다시 시도해 주세요.` : "잠시 후 다시 시도해 주세요.");
      } else {
        setStatus("로그인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    setSubmitting(true);
    try {
      const result = await props.client.logout();
      if (result.ok) {
        setAuthenticated(false);
        setContent(null);
        setStatus("로그아웃되었습니다.");
      } else {
        setStatus("로그아웃할 수 없습니다. 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main class="page-shell">
      <section class="auth-card" aria-labelledby="login-title">
        <header class="card-heading">
          <p class="eyebrow">QUAIL</p>
          <h1 id="login-title">로그인</h1>
          <p class="intro">계속하려면 비밀번호를 입력해 주세요.</p>
        </header>

        <Show when={!checking()} fallback={<p class="status" role="status">로그인 상태 확인 중…</p>}>
          <Show
            when={!authenticated()}
            fallback={
              <div class="signed-in-panel">
                <Show when={content()} fallback={<p class="status" role="status">보호된 내용을 불러오는 중…</p>}>
                  {(privateContent) => (
                    <article class="protected-content" aria-live="polite">
                      <h2>{privateContent().heading}</h2>
                      <p>{privateContent().message}</p>
                    </article>
                  )}
                </Show>
                <button class="button button-secondary" type="button" onClick={signOut} disabled={submitting()}>
                  {submitting() ? "처리 중…" : "로그아웃"}
                </button>
              </div>
            }
          >
            <form class="login-form" onSubmit={submit}>
              <label for="password">비밀번호</label>
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                value={password()}
                onInput={(event) => setPassword(event.currentTarget.value)}
                disabled={submitting()}
              />
              <p class="status" role="status" aria-live="polite">{status()}</p>
              <button class="button" type="submit" disabled={submitting()}>
                {submitting() ? "확인 중…" : "로그인"}
              </button>
            </form>
          </Show>
        </Show>
      </section>
    </main>
  );
}
