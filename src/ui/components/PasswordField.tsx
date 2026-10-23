import { TextField } from "@kobalte/core/text-field";
import type { Component } from "solid-js";

export interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onInput: (value: string) => void;
  disabled?: boolean;
  autocomplete?: string;
  error?: string;
}

export const PasswordField: Component<PasswordFieldProps> = (props) => {
  return (
    <TextField
      value={props.value}
      onChange={props.onInput}
      disabled={props.disabled}
      validationState={props.error ? "invalid" : "valid"}
      class="grid gap-2"
    >
      <TextField.Label for={props.id} class="text-sm font-bold text-on-surface">
        {props.label}
      </TextField.Label>
      <TextField.Input
        id={props.id}
        type="password"
        name={props.id}
        required
        autocomplete={props.autocomplete ?? "current-password"}
        disabled={props.disabled}
        aria-invalid={Boolean(props.error)}
        class="min-h-11 w-full rounded-md border border-on-surface/20 bg-surface-brand-soft px-4 text-on-surface outline-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand"
      />
      {props.error ? (
        <TextField.ErrorMessage class="min-h-6 text-sm text-on-surface">
          {props.error}
        </TextField.ErrorMessage>
      ) : null}
    </TextField>
  );
};