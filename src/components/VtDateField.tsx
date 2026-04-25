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
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";

const WEEKDAYS_MON_FIRST = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

type Props = Readonly<{
  value: string;
  onChange: (isoDate: string) => void;
  min?: string;
  max?: string;
  /** Si no hay `value` y se permite vacío, mostramos el placeholder. */
  allowEmpty?: boolean;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  "aria-label"?: string;
}>;

function partsFromIso(s: string): { y: number; m: number; d: number } | null {
  const t = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const y = Number(t.slice(0, 4));
  const m = Number(t.slice(5, 7));
  const d = Number(t.slice(8, 10));
  if (!y || m < 1 || m > 12 || d < 1) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
    return null;
  return { y, m, d };
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayIso(): string {
  const t = new Date();
  return toIso(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

function monthNameEs(month1: number): string {
  return new Intl.DateTimeFormat("es", { month: "long" }).format(
    new Date(2000, month1 - 1, 1),
  );
}

function monthRangeForYear(
  y: number,
  minP: { y: number; m: number; d: number } | null,
  maxP: { y: number; m: number; d: number } | null,
): { m0: number; m1: number } | null {
  if (y < (minP?.y ?? -Infinity) || y > (maxP?.y ?? Infinity)) return null;
  const m0 = y === minP?.y ? minP.m : 1;
  const m1 = y === maxP?.y ? maxP.m : 12;
  if (m0 > m1) return null;
  return { m0, m1 };
}

function yearRangeClosed(lo: number, hi: number): number[] {
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  const out: number[] = [];
  for (let y = a; y <= b; y++) out.push(y);
  return out;
}

function yearOptionsFromBounds(
  minP: { y: number; m: number; d: number } | null,
  maxP: { y: number; m: number; d: number } | null,
): number[] {
  if (!minP && !maxP) {
    const cy = new Date().getFullYear();
    return yearRangeClosed(cy - 100, cy + 100);
  }
  if (minP && !maxP) {
    return yearRangeClosed(minP.y, minP.y + 150);
  }
  if (!minP && maxP) {
    return yearRangeClosed(1900, maxP.y);
  }
  if (minP && maxP) {
    return yearRangeClosed(minP.y, maxP.y).filter((y) =>
      monthRangeForYear(y, minP, maxP),
    );
  }
  return [new Date().getFullYear()];
}

function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

function parseBounds(b?: string): { y: number; m: number; d: number } | null {
  return b ? partsFromIso(b) : null;
}

function cmpIso(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function VtDateField({
  value,
  onChange,
  min,
  max,
  allowEmpty = false,
  placeholder = "Elegir fecha",
  id,
  disabled = false,
  className,
  buttonClassName,
  "aria-label": ariaLabel,
}: Props) {
  const genId = useId();
  const triggerId = id ?? `vt-df-${genId}`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const todayS = useMemo(() => todayIso(), []);

  const [vy, setVy] = useState(() => {
    const p = partsFromIso(value) ?? parseBounds(min) ?? partsFromIso(todayS);
    return p?.y ?? new Date().getFullYear();
  });
  const [vm, setVm] = useState(() => {
    const p = partsFromIso(value) ?? parseBounds(min) ?? partsFromIso(todayS);
    return p?.m ?? new Date().getMonth() + 1;
  });

  const updateBox = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({ top: r.bottom + 8, left: r.left, width: Math.max(r.width, 300) });
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
    if (!open) return;
    const p = partsFromIso(value);
    if (p) {
      setVy(p.y);
      setVm(p.m);
    }
  }, [open, value]);

  const minP = useMemo(() => parseBounds(min), [min]);
  const maxP = useMemo(() => parseBounds(max), [max]);
  useEffect(() => {
    const r = monthRangeForYear(vy, minP, maxP);
    if (!r) return;
    if (vm < r.m0 || vm > r.m1) setVm(r.m0);
  }, [vy, minP, maxP, vm, min, max]);

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

  const yearList = useMemo(
    () => yearOptionsFromBounds(minP, maxP),
    [minP, maxP],
  );
  const yearListResolved = useMemo(() => {
    if (yearList.includes(vy)) return yearList;
    return [...yearList, vy].sort((a, b) => a - b);
  }, [yearList, vy]);
  const monthRow = useMemo(() => {
    const r = monthRangeForYear(vy, minP, maxP);
    if (!r) return [] as { v: number; label: string }[];
    const items: { v: number; label: string }[] = [];
    for (let m = r.m0; m <= r.m1; m++) {
      items.push({ v: m, label: monthNameEs(m) });
    }
    return items;
  }, [vy, minP, maxP]);

  const { cells, canPrev, canNext } = useMemo(() => {
    const dim = daysInMonth(vy, vm);
    const first = new Date(vy, vm - 1, 1);
    const dow = first.getDay();
    const mon0 = (dow + 6) % 7;
    const out: { iso: string; inMonth: boolean }[] = [];
    for (let i = 0; i < mon0; i++) {
      const d = new Date(vy, vm - 1, 1 - mon0 + i);
      out.push({
        iso: toIso(d.getFullYear(), d.getMonth() + 1, d.getDate()),
        inMonth: false,
      });
    }
    for (let d = 1; d <= dim; d++) {
      out.push({ iso: toIso(vy, vm, d), inMonth: true });
    }
    let n = 1;
    while (out.length < 42) {
      const d = new Date(vy, vm - 1, dim + n);
      out.push({
        iso: toIso(d.getFullYear(), d.getMonth() + 1, d.getDate()),
        inMonth: false,
      });
      n++;
    }
    const tPrev = new Date(vy, vm - 1, 0);
    const lastPrevIso = toIso(
      tPrev.getFullYear(),
      tPrev.getMonth() + 1,
      tPrev.getDate(),
    );
    const tNext = new Date(vy, vm, 1);
    const firstNextIso = toIso(
      tNext.getFullYear(),
      tNext.getMonth() + 1,
      tNext.getDate(),
    );
    const cPrev = !min || lastPrevIso >= min;
    const cNext = !max || firstNextIso <= max;
    return { cells: out, canPrev: cPrev, canNext: cNext };
  }, [vy, vm, min, max]);

  const labelButton = useMemo(() => {
    if (!value.trim() && allowEmpty) return null;
    const p = partsFromIso(value);
    if (p) {
      return new Intl.DateTimeFormat("es", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(p.y, p.m - 1, p.d));
    }
    return null;
  }, [value, allowEmpty]);

  function inRange(iso: string): boolean {
    if (min && cmpIso(iso, min) < 0) return false;
    if (max && cmpIso(iso, max) > 0) return false;
    return true;
  }

  function goPrev() {
    if (vm === 1) {
      setVm(12);
      setVy((x) => x - 1);
    } else setVm((m) => m - 1);
  }

  function goNext() {
    if (vm === 12) {
      setVm(1);
      setVy((x) => x + 1);
    } else setVm((m) => m + 1);
  }

  const popover = open && box && !disabled && (
    <div
      ref={listRef}
      className="fixed z-[220] max-w-[min(100vw-24px,360px)] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_18px_50px_rgba(2,6,23,0.22)]"
      style={{ top: box.top, left: box.left, width: box.width, maxWidth: "min(100vw - 24px, 360px)" }}
      role="dialog"
      aria-label="Calendario"
    >
      <div className="mb-3 flex items-center justify-between gap-1.5 sm:gap-2">
        <button
          type="button"
          className="vt-btn flex h-9 w-9 shrink-0 p-0 disabled:opacity-35"
          onClick={goPrev}
          disabled={!canPrev}
          aria-label="Mes anterior"
        >
          <ChevronLeft size={18} className="mx-auto" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <label className="sr-only" htmlFor={`${triggerId}-cal-month`}>
            Mes
          </label>
          <select
            id={`${triggerId}-cal-month`}
            className="vt-input h-9 min-w-0 flex-1 cursor-pointer px-2.5 py-1.5 text-[13px] font-extrabold capitalize text-[var(--text)]"
            value={String(vm)}
            onChange={(e) => setVm(Number(e.target.value))}
            aria-label="Elegir mes"
          >
            {monthRow.map(({ v, label }) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`${triggerId}-cal-year`}>
            Año
          </label>
          <select
            id={`${triggerId}-cal-year`}
            className="vt-input h-9 w-[4.5rem] shrink-0 cursor-pointer px-2 py-1.5 text-[13px] font-extrabold text-[var(--text)] sm:w-[5.25rem]"
            value={String(vy)}
            onChange={(e) => {
              const y = Number(e.target.value);
              setVy(y);
              const r = monthRangeForYear(y, minP, maxP);
              if (r && (vm < r.m0 || vm > r.m1)) setVm(r.m0);
            }}
            aria-label="Elegir año"
          >
            {yearListResolved.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="vt-btn flex h-9 w-9 shrink-0 p-0 disabled:opacity-35"
          onClick={goNext}
          disabled={!canNext}
          aria-label="Mes siguiente"
        >
          <ChevronRight size={18} className="mx-auto" aria-hidden />
        </button>
      </div>
      <div className="mb-1.5 grid grid-cols-7 gap-y-0.5 text-center text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        {WEEKDAYS_MON_FIRST.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          const dis = !inRange(c.iso);
          const sel = value === c.iso;
          const isTod = c.iso === todayS;
          return (
            <button
              key={`${c.iso}-${idx}`}
              type="button"
              disabled={dis}
              onClick={() => {
                onChange(c.iso);
                setOpen(false);
              }}
              className={cn(
                "grid h-9 w-full place-items-center rounded-lg text-[13px] font-semibold transition-colors",
                !c.inMonth && "text-[color-mix(in_oklab,var(--muted)_90%,var(--text))]",
                c.inMonth && !dis && "text-[var(--text)]",
                dis && "cursor-not-allowed opacity-30",
                !dis &&
                  !sel &&
                  c.inMonth &&
                  "hover:bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]",
                !dis &&
                  !sel &&
                  !c.inMonth &&
                  "hover:bg-[color-mix(in_oklab,var(--bg)_80%,var(--surface))]",
                sel &&
                  "bg-[var(--primary)] text-white shadow-[0_1px_0_rgba(0,0,0,0.08)] ring-0",
                isTod &&
                  !sel &&
                  c.inMonth &&
                  !dis &&
                  "ring-1 ring-inset ring-[color-mix(in_oklab,var(--primary)_45%,var(--border))]",
              )}
            >
              {partsFromIso(c.iso)?.d}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] pt-3 text-[13px]">
        {allowEmpty && value ? (
          <button
            type="button"
            className="mr-auto cursor-pointer font-semibold text-[var(--primary)] underline decoration-[color-mix(in_oklab,var(--primary)_45%,transparent)] underline-offset-2 hover:opacity-90"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Limpiar
          </button>
        ) : null}
        <button
          type="button"
          className="cursor-pointer font-semibold text-[var(--primary)] underline decoration-[color-mix(in_oklab,var(--primary)_45%,transparent)] underline-offset-2 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => {
            if (!inRange(todayS)) return;
            onChange(todayS);
            setOpen(false);
          }}
          disabled={!inRange(todayS)}
        >
          Hoy
        </button>
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
            "min-w-0 truncate font-semibold",
            !labelButton && "text-[var(--muted)]",
          )}
        >
          {labelButton ?? placeholder}
        </span>
        <Calendar
          size={16}
          className="shrink-0 text-[var(--muted)]"
          aria-hidden
        />
      </button>
      {open && !disabled && box && typeof document !== "undefined"
        ? createPortal(popover, document.body)
        : null}
    </div>
  );
}
