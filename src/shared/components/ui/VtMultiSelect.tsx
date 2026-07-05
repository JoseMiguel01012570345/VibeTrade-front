import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@shared/lib/cn";
import type { VtSelectOption } from "./VtSelect";

type Props = Readonly<{
  value: readonly string[];
  onChange: (value: string[]) => void;
  options: readonly VtSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  listClassName?: string;
  itemClassName?: string;
  ariaLabel?: string;
}>;

const DEFAULT_BUTTON =
  "flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_8%,var(--surface))] px-3 py-2.5 text-sm text-[var(--text)] hover:border-[color-mix(in_oklab,var(--primary)_28%,var(--border))]";

const DEFAULT_LIST =
  "max-h-52 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow)]";

const DEFAULT_ITEM =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--muted)_10%,var(--surface))]";

function summaryLabel(values: readonly string[], placeholder: string): string {
  if (values.length === 0) return placeholder;
  const joined = values.join(", ");
  if (joined.length <= 48) return joined;
  return `${values.length} seleccionados`;
}

/** Multi-select con portal; pendiente de CeMultiSelect dedicado. */
export function VtMultiSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  disabled = false,
  className,
  buttonClassName,
  listClassName,
  itemClassName,
  ariaLabel,
}: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(value), [value]);
  const buttonText = useMemo(() => summaryLabel(value, placeholder), [value, placeholder]);
  const hasOptions = options.length > 0;
  const isDisabled = disabled || !hasOptions;

  useEffect(() => {
    if (!hasOptions) setOpen(false);
  }, [hasOptions]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  function toggle(v: string) {
    const next = new Set(selectedSet);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  }

  const list =
    hasOptions && open ? (
      <div
        ref={listRef}
        className={cn(DEFAULT_LIST, listClassName)}
      >
        {options.map((o) => {
          const on = selectedSet.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              disabled={o.disabled}
              className={cn(DEFAULT_ITEM, itemClassName)}
              onClick={() => !o.disabled && toggle(o.value)}
            >
              <Check size={14} className={on ? "opacity-100" : "opacity-0"} aria-hidden />
              {o.label}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-expanded={open && hasOptions}
        aria-haspopup="listbox"
        className={cn(DEFAULT_BUTTON, isDisabled && "cursor-not-allowed opacity-60", buttonClassName)}
        onClick={() => {
          if (!isDisabled) setOpen((v) => !v);
        }}
      >
        <span className="truncate">{buttonText}</span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-[var(--muted)]", open && hasOptions && "rotate-180")}
          aria-hidden
        />
      </button>
      {list
        ? createPortal(
            <div
              className="fixed z-[300] mt-1"
              style={{
                top: rootRef.current?.getBoundingClientRect().bottom ?? 0,
                left: rootRef.current?.getBoundingClientRect().left ?? 0,
                width: rootRef.current?.getBoundingClientRect().width ?? 200,
              }}
            >
              {list}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
