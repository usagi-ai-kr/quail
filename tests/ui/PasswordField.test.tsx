import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PasswordField } from "../../src/ui/components/PasswordField";

afterEach(cleanup);

describe("PasswordField", () => {
  it("Given an invalid disabled field, When it renders, Then the input exposes aria-invalid and the error text is available", () => {
    render(() => (
      <PasswordField
        id="password"
        label="비밀번호"
        value=""
        onInput={vi.fn()}
        error="비밀번호를 입력해 주세요."
        disabled
      />
    ));

    const input = screen.getByLabelText("비밀번호") as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.disabled).toBe(true);
    expect(screen.getByText("비밀번호를 입력해 주세요.")).toBeTruthy();
  });

  it("Given a valid field, When it renders, Then the input is enabled and has no error text", () => {
    render(() => (
      <PasswordField id="password" label="비밀번호" value="secret" onInput={vi.fn()} />
    ));

    const input = screen.getByLabelText("비밀번호") as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });
});