import { createSignal, onMount, Show } from "solid-js";
import type { AuthClient, ProtectedContent } from "../app/auth-client";
import { Button } from "./components/Button";
import { PasswordField } from "./components/PasswordField";
import { formatRetryAfter, uiCopy } from "./content/ko";

export default function LoginPage(props: { client: AuthClient }) {
  const [authenticated, setAuthenticated] = createSignal(false);
  const [checking, setChecking] = createSignal(true);
  const [submitting, setSubmitting] = createSignal(false);
  const [password, setPassword] = createSignal("");
  const [status, setStatus] = createSignal("");
  const [content, setContent] = createSignal<ProtectedContent | null>(null);
  const [contentError, setContentError] = createSignal(false);

  async function loadProtectedContent() {
    setContentError(false);
    const result = await props.client.getProtectedContent();
    if (result.ok) {
      setContent(result.content);
    } else if (result.reason === "unauthenticated") {
      setAuthenticated(false);
      setContent(null);
      setStatus(uiCopy.sessionExpired);
    } else {
      setContent(null);
      setContentError(true);
      setStatus(uiCopy.protectedContentUnavailable);
    }
  }

  onMount(async () => {
    try {
      const result = await props.client.getSession();
      if (result.authenticated) {
        setAuthenticated(true);
        await loadProtectedContent();
      } else if (result.reason === "unavailable") {
        setStatus(uiCopy.sessionCheckFailed);
      }
    } finally {
      setChecking(false);
    }
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (submitting()) return;
    setSubmitting(true);
    setStatus("");
    try {
      const result = await props.client.login(password());
      if (result.ok) {
        setPassword("");
        setAuthenticated(true);
        setStatus(uiCopy.loginSuccess);
        await loadProtectedContent();
      } else if (result.reason === "invalid-password") {
        setStatus(uiCopy.invalidPassword);
      } else if (result.reason === "rate-limited") {
        const seconds = result.retryAfterSeconds ?? 0;
        setStatus(seconds > 0 ? formatRetryAfter(seconds) : uiCopy.loginUnavailable);
      } else {
        setStatus(uiCopy.loginUnavailable);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    if (submitting()) return;
    setSubmitting(true);
    try {
      const result = await props.client.logout();
      if (result.ok) {
        setAuthenticated(false);
        setContent(null);
        setStatus(uiCopy.logoutSuccess);
      } else {
        setStatus(uiCopy.logoutFailed);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main class="page-shell">
      <section class="w-full max-w-md rounded-lg border border-brand/20 bg-surface p-6 shadow-lg sm:p-8" aria-labelledby="login-title">
        <header class="mb-6">
          <p class="mb-3 text-xs font-bold tracking-[0.14em] text-brand-strong">{uiCopy.brand}</p>
          <h1 id="login-title" class="text-2xl font-bold tracking-tight text-on-surface sm:text-[2.25rem]">
            {uiCopy.loginTitle}
          </h1>
          <p class="mt-2 leading-6 text-on-surface">{uiCopy.loginIntro}</p>
        </header>

        <Show when={!checking()} fallback={<p class="min-h-6 text-sm text-on-surface" role="status">{uiCopy.checkingSession}</p>}>
          <Show
            when={!authenticated()}
            fallback={
              <div class="grid gap-4">
                <Show when={content()} fallback={
                  <p class="min-h-6 text-sm text-on-surface" role="status" aria-live="polite">
                    {contentError() ? status() : uiCopy.protectedContentLoading}
                  </p>
                }>
                  {(privateContent) => (
                    <article class="rounded-md bg-surface-brand p-4 text-on-surface-brand" aria-live="polite">
                      <h2 class="mb-2 text-xl font-bold">{privateContent().heading}</h2>
                      <p class="leading-6">{privateContent().message}</p>
                    </article>
                  )}
                </Show>
                <Button type="button" variant="secondary" onClick={signOut} disabled={submitting()} class="w-full">
                  {submitting() ? uiCopy.loggingOut : uiCopy.logoutButton}
                </Button>
              </div>
            }
          >
            <form class="grid gap-3" onSubmit={submit}>
              <PasswordField id="password" label={uiCopy.passwordLabel} value={password()} onInput={setPassword} disabled={submitting()} />
              <p class="min-h-6 text-sm text-on-surface" role="status" aria-live="polite">{status()}</p>
              <Button type="submit" disabled={submitting()}>
                {submitting() ? uiCopy.loggingIn : uiCopy.loginButton}
              </Button>
            </form>
          </Show>
        </Show>
      </section>
    </main>
  );
}