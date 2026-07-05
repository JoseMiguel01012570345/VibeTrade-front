import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Checkbox, type CheckboxProps } from "flowbite-react";
import { Calendar } from "lucide-react";
import { cn } from "@shared/lib/cn";

export const CE_ADMIN_BRAND = "#006837";

export const CE_UI_BG = "bg-[#FDFCF9]";
export const CE_UI_SURFACE =
  "rounded-2xl border border-[#E8ECF2] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]";
export const CE_UI_CARD_TINT = "rounded-2xl border border-[#D8DEE8] bg-[#EFF2F9]";
export const CE_UI_MINT_ZONE =
  "rounded-2xl border border-[#BFDCC4] bg-[#E8F5E9]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]";
export const CE_UI_PRIMARY =
  "bg-[#006837] hover:bg-[#005530] focus:ring-[#006837] disabled:opacity-60";
export const CE_TX_HEAD = "text-[#0F172A]";
export const CE_TX_MUTED = "text-[#64748B]";

const fieldClass =
  "h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#006837] focus:ring-2 focus:ring-[#006837]/20 disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] dark:border-gray-600 dark:bg-gray-900 dark:text-white";

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
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
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
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
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
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
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
  "text-[#006837] focus:ring-[#006837] dark:text-[#006837] dark:focus:ring-[#006837]";

/** Checkbox verde del modal de producto (referencia frontend-admin). */
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
      className="mb-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
