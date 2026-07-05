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
  ariaLabel?: string;
}>;

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
  ariaLabel,
}: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(value), [value]);
  const buttonText = useMemo(() => summaryLabel(value, placeholder), [value, placeholder]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
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

  const list = (
    <div
      className={cn(
        "max-h-52 overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800",
        listClassName,
      )}
    >
      {options.map((o) => {
        const on = selectedSet.has(o.value);
        return (
          <button
            key={o.value}
            type="button"
            disabled={o.disabled}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => !o.disabled && toggle(o.value)}
          >
            <Check size={14} className={on ? "opacity-100" : "opacity-0"} aria-hidden />
            {o.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-800",
          buttonClassName,
        )}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span className="truncate">{buttonText}</span>
        <ChevronDown size={16} aria-hidden />
      </button>
      {open
        ? createPortal(
            <div className="fixed z-[300] mt-1" style={{ top: rootRef.current?.getBoundingClientRect().bottom ?? 0, left: rootRef.current?.getBoundingClientRect().left ?? 0, width: rootRef.current?.getBoundingClientRect().width ?? 200 }}>
              {list}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
