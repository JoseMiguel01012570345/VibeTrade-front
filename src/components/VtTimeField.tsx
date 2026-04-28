import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Clock } from "lucide-react";
import { cn } from "../lib/cn";

const H12_LIST = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const MERIDIEM = ["AM", "PM"] as const;
type Meridiem = (typeof MERIDIEM)[number];

type Props = Readonly<{
  value: string;
  onChange: (hhmm: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  /** Placeholder en el gatillo si no hay valor. */
  placeholder?: string;
  /** z-index del popover portaled (alinear con `VtDateField` en modales apilados). */
  popoverZIndexClass?: string;
  "aria-label"?: string;
}>;

function parseHm(s: string): { h: number; m: number } | null {
  const t = s.trim();
  if (!/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [a, b] = t.split(":");
  const h = Number(a);
  const m = Number(b);
  if (!Number.isInteger(h) || h < 0 || h > 23) return null;
  if (!Number.isInteger(m) || m < 0 || m > 59) return null;
  return { h, m };
}

function toHm24(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function to24hFrom12(h12: number, m: number, ap: Meridiem): string {
  let h: number;
  if (ap === "AM") {
    h = h12 === 12 ? 0 : h12;
  } else {
    h = h12 === 12 ? 12 : h12 + 12;
  }
  return toHm24(h, m);
}

function from24h(s: string): { h12: number; m: number; ap: Meridiem } {
  const p = parseHm(s);
  if (!p) {
    return { h12: 9, m: 0, ap: "AM" as Meridiem };
  }
  const h24 = p.h;
  const m = p.m;
  if (h24 === 0) return { h12: 12, m, ap: "AM" };
  if (h24 === 12) return { h12: 12, m, ap: "PM" };
  if (h24 < 12) return { h12: h24, m, ap: "AM" };
  return { h12: h24 - 12, m, ap: "PM" };
}

function displayTriggerLabel(s: string, placeholder: string): string {
  if (!s.trim()) return placeholder;
  const p = parseHm(s);
  if (!p) return placeholder;
  const t = new Date(2000, 0, 1, p.h, p.m, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(t);
}

function formatHourPill(n: number): string {
  return n === 12 ? "12" : String(n).padStart(2, "0");
}

function formatMinutePill(n: number): string {
  return String(n).padStart(2, "0");
}

function scrollToSelected(
  col: RefObject<HTMLDivElement | null>,
  selectedRef: RefObject<HTMLButtonElement | null>,
) {
  const wrap = col.current;
  const btn = selectedRef.current;
  if (!wrap || !btn) return;
  const w = wrap.getBoundingClientRect();
  const b = btn.getBoundingClientRect();
  const top = wrap.scrollTop + (b.top - w.top) - w.height / 2 + b.height / 2;
  wrap.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export function VtTimeField({
  value,
  onChange,
  id,
  disabled = false,
  className,
  buttonClassName,
  placeholder = "Elegir hora",
  popoverZIndexClass = "z-[220]",
  "aria-label": ariaLabel,
}: Props) {
  const genId = useId();
  const triggerId = id ?? `vt-tf-${genId}`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const [h12, setH12] = useState(() => from24h(value).h12);
  const [m, setM] = useState(() => from24h(value).m);
  const [ap, setAp] = useState<Meridiem>(() => from24h(value).ap);
  const prevOpen = useRef(false);

  const hourRef = useRef<HTMLDivElement | null>(null);
  const minRef = useRef<HTMLDivElement | null>(null);
  const apRef = useRef<HTMLDivElement | null>(null);
  const hSel = useRef<HTMLButtonElement | null>(null);
  const mSel = useRef<HTMLButtonElement | null>(null);
  const aSel = useRef<HTMLButtonElement | null>(null);

  const updateBox = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({
      top: r.bottom + 8,
      left: r.left,
      width: Math.max(r.width, 280),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateBox();
  }, [open, updateBox]);

  useEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    const on = () => updateBox();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, [open, updateBox]);

  useEffect(() => {
    const p3 = from24h(value);
    setH12(p3.h12);
    setM(p3.m);
    setAp(p3.ap);
  }, [value]);

  /** Al cerrar el desplegable, alinear con `value` (p. ej. el padre rechazó un `onChange` inválido). */
  useEffect(() => {
    if (prevOpen.current && !open) {
      const p3 = from24h(value);
      setH12(p3.h12);
      setM(p3.m);
      setAp(p3.ap);
    }
    prevOpen.current = open;
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open) return;
    scrollToSelected(hourRef, hSel);
    scrollToSelected(minRef, mSel);
    scrollToSelected(apRef, aSel);
  }, [open, h12, m, ap]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (!open) return;
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function applyH12(next: number) {
    setH12(next);
    onChange(to24hFrom12(next, m, ap));
  }

  function applyMin(next: number) {
    setM(next);
    onChange(to24hFrom12(h12, next, ap));
  }

  function applyAp(next: Meridiem) {
    setAp(next);
    onChange(to24hFrom12(h12, m, next));
  }

  const label = useMemo(
    () => displayTriggerLabel(value, placeholder),
    [value, placeholder],
  );

  const colClass =
    "vt-time-scroll max-h-52 min-w-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,var(--surface))] py-1.5";

  const itemBtn = (sel: boolean) =>
    cn(
      "w-full min-h-[2.25rem] px-2 text-center text-[14px] font-semibold tabular-nums text-[var(--text)]",
      "transition-[background,color,box-shadow] duration-100",
      !sel && "hover:bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]",
      sel &&
        "bg-[var(--primary)] text-white shadow-[0_1px_0_rgba(0,0,0,0.06)]",
    );

  const popover = open && box && !disabled && (
    <div
      ref={listRef}
      className={cn(
        "fixed max-w-[min(100vw-24px,340px)] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_18px_50px_rgba(2,6,23,0.22)]",
        popoverZIndexClass,
      )}
      style={{
        top: box.top,
        left: box.left,
        width: box.width,
        maxWidth: "min(100vw - 24px, 340px)",
      }}
      role="dialog"
      aria-label="Elegir hora"
    >
      <div className="mb-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        Hora
      </div>
      <div className="flex gap-2 sm:gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="text-center text-[10px] font-bold text-[var(--muted)]">H</div>
          <div ref={hourRef} className={colClass}>
            {H12_LIST.map((n) => {
              const selected = h12 === n;
              return (
                <button
                  key={n}
                  ref={selected ? hSel : undefined}
                  type="button"
                  className={itemBtn(selected)}
                  onClick={() => applyH12(n)}
                >
                  {formatHourPill(n)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="text-center text-[10px] font-bold text-[var(--muted)]">Min</div>
          <div ref={minRef} className={colClass}>
            {MINUTES.map((n) => {
              const selected = m === n;
              return (
                <button
                  key={n}
                  ref={selected ? mSel : undefined}
                  type="button"
                  className={itemBtn(selected)}
                  onClick={() => applyMin(n)}
                >
                  {formatMinutePill(n)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex w-[4.5rem] shrink-0 flex-col gap-0.5">
          <div className="text-center text-[10px] font-bold text-[var(--muted)]"> </div>
          <div ref={apRef} className={colClass}>
            {MERIDIEM.map((mer) => {
              const selected = ap === mer;
              return (
                <button
                  key={mer}
                  ref={selected ? aSel : undefined}
                  type="button"
                  className={itemBtn(selected)}
                  onClick={() => applyAp(mer)}
                >
                  {mer}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        className={cn(
          "vt-input flex min-h-[42px] w-full items-center justify-between gap-2 text-left",
          "shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]",
          "hover:border-[color-mix(in_oklab,var(--primary)_22%,var(--border))]",
          "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_25%,transparent)] focus-visible:border-[color-mix(in_oklab,var(--primary)_45%,var(--border))]",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          buttonClassName,
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span
          className={cn(
            "min-w-0 truncate font-semibold tabular-nums",
            !value.trim() && "text-[var(--muted)]",
          )}
        >
          {label}
        </span>
        <Clock size={16} className="shrink-0 text-[var(--muted)]" aria-hidden />
      </button>
      {open && !disabled && box && typeof document !== "undefined"
        ? createPortal(popover, document.body)
        : null}
    </div>
  );
}
