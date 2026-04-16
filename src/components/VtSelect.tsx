import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";

export type VtSelectOption = Readonly<{
  value: string;
  label: string;
  disabled?: boolean;
}>;

type Props = Readonly<{
  value: string;
  onChange: (value: string) => void;
  options: VtSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  listClassName?: string;
  ariaLabel?: string;
}>;

export function VtSelect({
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

  const selected = useMemo(() => {
    return options.find((o) => o.value === value);
  }, [options, value]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "vt-input flex w-full items-center justify-between gap-2 text-left",
          "shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]",
          "hover:border-[color-mix(in_oklab,var(--primary)_22%,var(--border))]",
          "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_25%,transparent)] focus-visible:border-[color-mix(in_oklab,var(--primary)_45%,var(--border))]",
          disabled && "cursor-not-allowed opacity-60",
          buttonClassName,
        )}
        onClick={() => setOpen((x) => !x)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={cn("min-w-0 truncate font-semibold", !selected && "text-[var(--muted)]")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-[var(--muted)] transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+8px)] z-[70] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(2,6,23,0.22)]",
            listClassName,
          )}
          role="listbox"
          aria-label={ariaLabel ?? "Opciones"}
          id={id}
        >
          <div className="max-h-[280px] overflow-auto py-1">
            {options.map((o) => {
              const isSel = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  disabled={o.disabled}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 border-0 bg-transparent px-3 py-2.5 text-left text-[13px]",
                    "hover:bg-[color-mix(in_oklab,var(--primary)_7%,transparent)]",
                    isSel && "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]",
                    o.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                  )}
                  onClick={() => {
                    if (o.disabled) return;
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 truncate font-semibold">{o.label}</span>
                  {isSel ? (
                    <Check size={16} className="shrink-0 text-[var(--primary)]" aria-hidden />
                  ) : (
                    <span className="w-4 shrink-0" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

