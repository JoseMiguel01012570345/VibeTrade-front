import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  /**
   * Renderiza el menú en un portal fijo a `body` (evita corte en `overflow` de modales / scroll) y
   * posiciona con `getBoundingClientRect` del trigger.
   */
  listPortal?: boolean;
  listPortalZIndexClass?: string;
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
  listPortal = false,
  listPortalZIndexClass = "z-[200]",
  ariaLabel,
}: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [portalBox, setPortalBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const selected = useMemo(() => {
    return options.find((o) => o.value === value);
  }, [options, value]);

  const updatePortalBox = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Triggers muy estrechos (p. ej. día 1–31) dejan el listbox sin sitio para el texto; un mínimo legible.
    setPortalBox({
      top: r.bottom + 8,
      left: r.left,
      width: Math.max(r.width, 100),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || !listPortal) return;
    updatePortalBox();
  }, [open, listPortal, updatePortalBox]);

  useEffect(() => {
    if (!open) setPortalBox(null);
  }, [open]);

  useEffect(() => {
    if (!open || !listPortal) return;
    const on = () => updatePortalBox();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, [open, listPortal, updatePortalBox]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      if (listRef.current?.contains(e.target as Node)) return;
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
          "vt-input flex min-h-[42px] w-full items-center justify-between gap-2 text-left",
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

      {open
        ? (() => {
            if (listPortal && !portalBox) return null;
            const listInner = (
              <div
                ref={listRef}
                className={cn(
                  "overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(2,6,23,0.22)]",
                  listPortal
                    ? cn("fixed", listPortalZIndexClass)
                    : "absolute left-0 right-0 top-[calc(100%+8px)] z-[70]",
                  listClassName,
                )}
                style={
                  listPortal && portalBox
                    ? {
                        top: portalBox.top,
                        left: portalBox.left,
                        width: portalBox.width,
                      }
                    : undefined
                }
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
                          "flex w-full min-w-0 items-center gap-2 border-0 bg-transparent px-3 py-2.5 text-left text-[13px]",
                          "hover:bg-[color-mix(in_oklab,var(--primary)_7%,transparent)]",
                          isSel &&
                            "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]",
                          o.disabled &&
                            "cursor-not-allowed opacity-50 hover:bg-transparent",
                        )}
                        onClick={() => {
                          if (o.disabled) return;
                          onChange(o.value);
                          setOpen(false);
                        }}
                      >
                        <span className="min-w-0 flex-1 text-left font-semibold tabular-nums">
                          {o.label}
                        </span>
                        {isSel ? (
                          <Check
                            size={16}
                            className="shrink-0 text-[var(--primary)]"
                            aria-hidden
                          />
                        ) : (
                          <span className="inline-flex h-4 w-4 shrink-0" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
            if (listPortal) {
              if (typeof document === "undefined") {
                return listInner;
              }
              return createPortal(listInner, document.body);
            }
            return listInner;
          })()
        : null}
    </div>
  );
}

