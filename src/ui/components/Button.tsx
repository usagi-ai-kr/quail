import { Button as KobalteButton } from "@kobalte/core/button";
import type { ComponentProps } from "solid-js";

export type ButtonProps = ComponentProps<typeof KobalteButton>;

import { splitProps } from "solid-js";

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ["type", "class"]);
  return (
    <KobalteButton
      {...rest}
      type={local.type ?? "button"}
      class={[
        "inline-flex min-h-11 items-center justify-center rounded-md px-4 font-bold transition",
        "bg-brand text-on-brand hover:brightness-95 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand",
        "disabled:cursor-wait disabled:opacity-70",
        local.class,
      ].filter(Boolean).join(" ")}
    />
  );
}