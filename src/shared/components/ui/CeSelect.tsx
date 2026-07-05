import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@shared/lib/cn";
import type { CeSelectProps } from "@shared/types/ceUi";

export type { CeSelectProps } from "@shared/types/ceUi";

type OptionItem = { value: string; label: string; disabled?: boolean };

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node))
    return extractText((node.props as { children?: ReactNode }).children);
  return "";
}

/** Igualdad de valores del select; GUID en JSON a veces llega con distinta capitalización. */
function optionValuesEqual(a: string, b: string): boolean {
  if (a === b) return true;
  const ta = a.trim();
  const tb = b.trim();
  if (
    ta.length >= 32 &&
    tb.length >= 32 &&
    /^[\da-f-]+$/i.test(ta) &&
    /^[\da-f-]+$/i.test(tb)
  )
    return ta.toLowerCase() === tb.toLowerCase();
  return false;
}

function optionsFromChildren(children: ReactNode): OptionItem[] {
  const items: OptionItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type !== "option") return;
    const props = child.props as {
      value?: string | number;
      disabled?: boolean;
      children?: ReactNode;
    };
    items.push({
      value: String(props.value ?? ""),
      label: extractText(props.children).trim() || String(props.value ?? ""),
      disabled: Boolean(props.disabled),
    });
  });
  return items;
}

/** Trigger del listbox (sustituye el aspecto plano del &lt;select&gt; nativo). */
const listboxTriggerClass =
  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-gray-200/90 bg-white/95 px-3 py-2.5 pr-10 text-left text-sm text-gray-900 shadow-sm ring-1 ring-black/[0.04] transition " +
  "hover:border-primary-400/50 hover:bg-gray-50/80 hover:shadow-md hover:ring-primary-500/15 " +
  "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/35 " +
  "dark:border-gray-600 dark:bg-gray-800/95 dark:text-white dark:ring-white/[0.06] " +
  "dark:hover:border-primary-400/40 dark:hover:bg-gray-800 dark:hover:ring-primary-400/20 " +
  "dark:focus:border-primary-400 dark:focus:ring-primary-400/35 " +
  "disabled:cursor-not-allowed disabled:opacity-55";

const panelClass =
  "max-h-60 overflow-auto rounded-xl border border-gray-200/90 bg-white py-1 shadow-2xl shadow-gray-900/15 ring-1 ring-black/[0.06] backdrop-blur-sm " +
  "dark:border-gray-600 dark:bg-gray-800 dark:shadow-black/50 dark:ring-white/10";

const optionClass =
  "w-full cursor-pointer px-3 py-2.5 text-left text-sm text-gray-900 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700/90";

const optionDisabledClass =
  "cursor-not-allowed opacity-45 hover:bg-transparent dark:hover:bg-transparent";

const optionActiveClass =
  "bg-primary-50 font-medium text-primary-900 dark:bg-primary-900/35 dark:text-primary-100";

const VIEWPORT_EDGE = 8;
const MENU_GAP = 6;

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-gray-500 transition-transform dark:text-gray-400 ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

/** Select visual moderno (listbox + portal) compatible con API de &lt;select&gt; y &lt;option&gt; hijos. */
export function CeSelect({
  className,
  error,
  id,
  children,
  value,
  disabled,
  onChange,
  wrapperClassName,
  panelMinWidthPx = 160,
}: CeSelectProps) {
  const errId = id ? `${id}-error` : undefined;
  const listboxId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight?: number;
  }>({ top: 0, left: 0, width: 0 });

  // Incluir `value` en dependencias: con `children` solo, en algunos padres la etiqueta visible no se
  // sincronizaba tras refrescar datos (p. ej. estado de pedido) aunque el `value` controlado cambiara.
  const options = useMemo(
    () => optionsFromChildren(children),
    [children, value],
  );
  const strValue = value === undefined || value === null ? "" : String(value);

  const selectedLabel = useMemo(() => {
    const hit = options.find((o) => optionValuesEqual(o.value, strValue));
    if (hit) return hit.label;
    if (!strValue) return options.find((o) => o.value === "")?.label ?? "—";
    return strValue;
  }, [options, strValue]);

  const measureAndPosition = useCallback(() => {
    const btn = btnRef.current;
    const panel = panelRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.max(r.width, panelMinWidthPx);

    let left = r.left;
    if (left + width > vw - VIEWPORT_EDGE)
      left = Math.max(VIEWPORT_EDGE, vw - width - VIEWPORT_EDGE);
    if (left < VIEWPORT_EDGE) left = VIEWPORT_EDGE;

    const spaceBelow = vh - r.bottom - MENU_GAP - VIEWPORT_EDGE;
    const spaceAbove = r.top - MENU_GAP - VIEWPORT_EDGE;

    let panelHeight = panel?.offsetHeight ?? 0;
    if (panelHeight === 0) {
      panelHeight = Math.min(Math.max(options.length, 1) * 42 + 12, 240);
    }

    const fitsBelow = panelHeight <= spaceBelow;
    const fitsAbove = panelHeight <= spaceAbove;

    let top: number;
    let maxHeight: number | undefined;

    if (fitsBelow) {
      top = r.bottom + MENU_GAP;
    } else if (fitsAbove) {
      top = r.top - panelHeight - MENU_GAP;
    } else if (spaceAbove > spaceBelow) {
      maxHeight = Math.max(96, spaceAbove);
      top = r.top - maxHeight - MENU_GAP;
    } else {
      maxHeight = Math.max(96, spaceBelow);
      top = r.bottom + MENU_GAP;
    }

    setMenuPos({ top, left, width, maxHeight });
  }, [options.length, panelMinWidthPx]);

  useLayoutEffect(() => {
    if (!open) return;
    measureAndPosition();
    const id = requestAnimationFrame(() => measureAndPosition());
    return () => cancelAnimationFrame(id);
  }, [open, measureAndPosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => {
      measureAndPosition();
    };
    window.addEventListener("resize", onScrollResize);
    window.addEventListener("scroll", onScrollResize, true);
    return () => {
      window.removeEventListener("resize", onScrollResize);
      window.removeEventListener("scroll", onScrollResize, true);
    };
  }, [open, measureAndPosition]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(nextVal: string) {
    if (disabled) return;
    const opt = options.find((o) => optionValuesEqual(o.value, nextVal));
    if (opt?.disabled) return;
    const synthetic = {
      target: { value: nextVal },
      currentTarget: { value: nextVal },
    } as ChangeEvent<HTMLSelectElement>;
    onChange?.(synthetic);
    setOpen(false);
  }

  const triggerClasses = [
    listboxTriggerClass,
    error ? "border-red-400/80 ring-red-500/20 dark:border-red-500/50" : "",
    open
      ? "border-primary-500 ring-2 ring-primary-500/30 dark:border-primary-400"
      : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const dropdown =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            className={`${panelClass} fixed z-[300]`}
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: Math.max(menuPos.width, panelMinWidthPx),
              ...(menuPos.maxHeight != null
                ? { maxHeight: menuPos.maxHeight }
                : {}),
            }}
          >
            {options.map((opt, i) => {
              const active = optionValuesEqual(opt.value, strValue);
              const optDisabled = Boolean(opt.disabled);
              return (
                <button
                  key={`${opt.value}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-disabled={optDisabled || undefined}
                  disabled={optDisabled}
                  className={`${optionClass} ${active ? optionActiveClass : ""} ${optDisabled ? optionDisabledClass : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(opt.value)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={cn(
        "relative inline-block w-full min-w-[9.5rem] max-w-full align-middle",
        wrapperClassName,
      )}
    >
      {error ? (
        <p
          id={errId}
          role="alert"
          className="mb-1 text-sm font-medium text-black dark:text-gray-100"
        >
          {error}
        </p>
      ) : null}
      <div className="relative">
        <button
          ref={btnRef}
          type="button"
          id={id}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error && errId ? errId : undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          className={triggerClasses}
          onClick={() => !disabled && setOpen((v) => !v)}
        >
          <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        </button>
        <Chevron open={open} />
      </div>
      {dropdown}
    </div>
  );
}

/** @deprecated Usar clases del listbox; se mantiene por si algo importaba el string. */
export const ceSelectBaseClass = listboxTriggerClass;
