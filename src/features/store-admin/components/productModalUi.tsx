import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Checkbox, type CheckboxProps } from "flowbite-react";
import { Calendar } from "lucide-react";
import { cn } from "@shared/lib/cn";

export const CE_ADMIN_BRAND = "#006837";

export const CE_UI_BG = "bg-[var(--bg)]";
export const CE_UI_SURFACE =
  "rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]";
export const CE_UI_CARD_TINT =
  "rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))]";
export const CE_UI_INSET =
  "rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_42%,var(--surface))]";
export const CE_UI_MINT_ZONE =
  "rounded-2xl border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface))] shadow-[inset_0_1px_0_color-mix(in_oklab,var(--surface)_60%,transparent)]";
export const CE_UI_PRIMARY =
  "bg-[var(--profile-emerald-dark,#0b5540)] text-white hover:bg-[var(--profile-emerald-hover,#005530)] hover:text-white focus:ring-[var(--profile-emerald,#0f6b4f)] disabled:opacity-60";
export const CE_TX_HEAD = "text-[var(--text)]";
export const CE_TX_MUTED = "text-[var(--muted)]";

const fieldClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] shadow-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[color-mix(in_oklab,var(--primary)_55%,var(--border))] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)] disabled:cursor-not-allowed disabled:bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] disabled:text-[var(--muted)]";

export function currencyOptionLabel(code: string): string {
  const labels: Record<string, string> = {
    USD: "Dólares estadounidenses (USD)",
    CUP: "Pesos cubanos (CUP)",
    EUR: "Euros (EUR)",
    MLC: "Moneda libremente convertible (MLC)",
  };
  return labels[code] ?? code;
}

export function ProductModalTextField({
  id,
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)} htmlFor={id}>
      <span className={cn("mb-1.5 block text-xs font-bold uppercase tracking-wide", CE_TX_MUTED)}>
        {label}
      </span>
      <input
        id={id}
        className={cn(fieldClass, error && "border-red-400 focus:border-red-500 focus:ring-red-500/20")}
        {...props}
      />
      {error ? <p className="mt-1 text-xs text-[var(--bad)]">{error}</p> : null}
    </label>
  );
}

export function ProductModalSelect({
  id,
  label,
  error,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block min-w-0", className)} htmlFor={id}>
      <span className={cn("mb-1.5 block text-xs font-bold uppercase tracking-wide", CE_TX_MUTED)}>
        {label}
      </span>
      <select
        id={id}
        className={cn(fieldClass, error && "border-red-400 focus:border-red-500 focus:ring-red-500/20")}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="mt-1 text-xs text-[var(--bad)]">{error}</p> : null}
    </label>
  );
}

export function ProductModalDateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className={cn("mb-1.5 block text-xs font-bold uppercase tracking-wide", CE_TX_MUTED)}>
        {label}
      </span>
      <div className="relative">
        <Calendar
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldClass, "pl-10")}
        />
      </div>
    </label>
  );
}

export const PRODUCT_MODAL_CHECK_CLASS =
  "text-[var(--primary)] focus:ring-[var(--primary)]";

export function ProductModalCheckbox(props: CheckboxProps) {
  return (
    <Checkbox
      color="green"
      className={PRODUCT_MODAL_CHECK_CLASS}
      {...props}
    />
  );
}

export function ProductModalIconButton({
  children,
  disabled,
  onClick,
  title,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="mb-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--bad)_35%,var(--border))] bg-[var(--surface)] text-[var(--bad)] shadow-sm transition hover:bg-[color-mix(in_oklab,var(--bad)_10%,var(--surface))] disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
