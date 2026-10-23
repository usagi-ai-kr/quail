import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { vi } from "vitest";
import { afterEach, describe, expect, it } from "vitest";
import LoginPage from "../../src/ui/LoginPage";
import type { AuthClient, ProtectedContent } from "../../src/app/auth-client";

function createClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    getSession: vi.fn<AuthClient["getSession"]>(async () => ({ authenticated: false })),
    getProtectedContent: vi.fn<AuthClient["getProtectedContent"]>(async () => ({ ok: false, reason: "unavailable" })),
    login: vi.fn<AuthClient["login"]>(async () => ({ ok: false, reason: "invalid-password" })),
    logout: vi.fn<AuthClient["logout"]>(async () => ({ ok: true })),
    ...overrides,
  };
}

afterEach(cleanup);

describe("LoginPage", () => {
  it("Given the login page, When it renders, Then the password field has an accessible label and semantic password type", async () => {
    const client = createClient();
    render(() => <LoginPage client={client} />);

    const input = (await screen.findByLabelText("비밀번호")) as HTMLInputElement;
    expect(input.getAttribute("type")).toBe("password");
    expect(screen.getByRole("button", { name: "로그인" })).toBeTruthy();
  });

  it("Given a pending login, When submit is triggered again, Then duplicate submission is blocked", async () => {
    let resolveLogin: (value: Awaited<ReturnType<AuthClient["login"]>>) => void = () => undefined;
    const login = vi.fn<AuthClient["login"]>(
      () => new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    const client = createClient({ login });
    render(() => <LoginPage client={client} />);

    const input = (await screen.findByLabelText("비밀번호")) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "secret" } });

    const button = screen.getByRole("button", { name: "로그인" }) as HTMLButtonElement;
    fireEvent.click(button);

    await waitFor(() => expect(button.getAttribute("data-disabled")).not.toBeNull());
    fireEvent.click(button);
    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith("secret");

    resolveLogin({ ok: true });
    await waitFor(() => expect(screen.getByRole("button", { name: "로그아웃" })).toBeTruthy());
  });

  it("Given invalid credentials, When login is submitted, Then the status region announces the failure", async () => {
    const client = createClient({
      login: vi.fn<AuthClient["login"]>(async () => ({ ok: false, reason: "invalid-password" })),
    });
    render(() => <LoginPage client={client} />);

    const input = (await screen.findByLabelText("비밀번호")) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("비밀번호를 확인해 주세요."));
  });

  it("Given a rate limit, When login is submitted, Then the status region announces retry timing", async () => {
    const client = createClient({
      login: vi.fn<AuthClient["login"]>(async () => ({ ok: false, reason: "rate-limited", retryAfterSeconds: 900 })),
    });
    render(() => <LoginPage client={client} />);

    const input = (await screen.findByLabelText("비밀번호")) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("900초 후 다시 시도해 주세요."));
  });

  it("Given an authenticated session but protected content fails, When the page renders, Then the failure is announced instead of loading forever", async () => {
    const client = createClient({
      getSession: vi.fn<AuthClient["getSession"]>(async () => ({ authenticated: true })),
      getProtectedContent: vi.fn<AuthClient["getProtectedContent"]>(async () => ({ ok: false, reason: "unavailable" })),
    });
    render(() => <LoginPage client={client} />);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("보호된 내용을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요."));
  });

  it("Given an authenticated session, When protected content loads, Then it is shown and logout returns to the form", async () => {
    const content: ProtectedContent = { heading: "Hello", message: "World" };
    const client = createClient({
      getSession: vi.fn<AuthClient["getSession"]>(async () => ({ authenticated: true })),
      getProtectedContent: vi.fn<AuthClient["getProtectedContent"]>(async () => ({ ok: true, content })),
      logout: vi.fn<AuthClient["logout"]>(async () => ({ ok: true })),
    });
    render(() => <LoginPage client={client} />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Hello" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "로그인" })).toBeTruthy());
    expect(screen.getByRole("status").textContent).toContain("로그아웃되었습니다.");
  });

  it("Given programmatic focus, When the password field and button are focused, Then they remain semantic focusable controls", async () => {
    const client = createClient();
    render(() => <LoginPage client={client} />);

    const input = (await screen.findByLabelText("비밀번호")) as HTMLInputElement;
    const button = screen.getByRole("button", { name: "로그인" }) as HTMLButtonElement;
    input.focus();
    expect(document.activeElement).toBe(input);
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});