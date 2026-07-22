import { type ButtonRootProps, Root } from "@kobalte/core/button";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { splitProps, type ValidComponent } from "solid-js";

const buttonClass =
  "group/button inline-flex h-9 shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent bg-primary bg-clip-padding px-2.5 text-sm font-medium text-primary-foreground outline-none transition-all hover:bg-primary/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

export type ButtonProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ButtonRootProps<T>
> & { class?: string };

export function Button<T extends ValidComponent = "button">(props: ButtonProps<T>) {
  const [local, others] = splitProps(props as ButtonProps, ["class"]);

  return <Root class={`${buttonClass} ${local.class ?? ""}`} {...others} />;
}
