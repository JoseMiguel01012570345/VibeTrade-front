import { cn } from "@shared/lib/cn";

export const profileTabLinkClass =
  "min-w-[calc(50%-6px)] flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-center font-black no-underline sm:min-w-0";

export function profileTabClass(active: boolean): string {
  return cn(
    profileTabLinkClass,
    active &&
      "border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]",
  );
}
