import { useEffect, useId, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { cn } from "../lib/cn";

export type VtAutocompleteOption = {
  value: string;
  label?: string;
};

function normalizeForMatch(s: string): string {
  return s.trim().toLowerCase();
}

type MatchMode = "substring" | "fuzzy";

export function VtAutocompleteInput({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  ariaLabel,
  className,
  inputClassName,
  disabled,
  maxVisibleOptions = 8,
  /** When false, all non-empty options are shown (e.g. server already matched the query). Default true narrows local lists with substring match. */
  filterOptionsLocally = true,
  matchMode = "fuzzy",
}: Readonly<{
  value: string;
  onChange: (v: string) => void;
  onSelect?: (v: string) => void;
  options: readonly VtAutocompleteOption[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  maxVisibleOptions?: number;
  filterOptionsLocally?: boolean;
  matchMode?: MatchMode;
}>) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const blurCloseTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const fuse = useMemo(() => {
    if (!filterOptionsLocally || matchMode !== "fuzzy") return null;
    const items = options
      .map((opt) => ({
        opt,
        hay: normalizeForMatch(opt.label ?? opt.value),
      }))
      .filter((x) => x.hay.length > 0);
    return new Fuse(items, {
      includeScore: true,
      shouldSort: true,
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: ["hay"],
    });
  }, [options, filterOptionsLocally, matchMode]);

  const visibleOptions = useMemo(() => {
    const q = normalizeForMatch(value);
    if (!q) return [];

    if (filterOptionsLocally && matchMode === "fuzzy" && fuse) {
      return fuse
        .search(q, { limit: Math.max(1, maxVisibleOptions) })
        .map((r) => r.item.opt);
    }

    const out: VtAutocompleteOption[] = [];
    for (const opt of options) {
      if (!opt?.value) continue;
      const hay = normalizeForMatch(opt.label ?? opt.value);
      if (!hay) continue;
      if (filterOptionsLocally) {
        if (!hay.includes(q)) continue;
      }
      out.push(opt);
      if (out.length >= Math.max(1, maxVisibleOptions)) break;
    }
    return out;
  }, [
    options,
    value,
    maxVisibleOptions,
    filterOptionsLocally,
    matchMode,
    fuse,
  ]);

  const shouldShow = open && !disabled && visibleOptions.length > 0;

  useEffect(() => {
    if (!shouldShow) setActiveIndex(-1);
  }, [shouldShow]);

  useEffect(() => {
    return () => {
      if (blurCloseTimerRef.current)
        window.clearTimeout(blurCloseTimerRef.current);
    };
  }, []);

  function selectValue(v: string) {
    onChange(v);
    onSelect?.(v);
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input
        type="search"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={shouldShow}
        aria-controls={listboxId}
        className={cn("vt-input w-full min-w-0", inputClassName)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (blurCloseTimerRef.current)
            window.clearTimeout(blurCloseTimerRef.current);
          blurCloseTimerRef.current = window.setTimeout(
            () => setOpen(false),
            140,
          );
        }}
        onKeyDown={(e) => {
          if (!shouldShow) return;
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setActiveIndex(-1);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(visibleOptions.length - 1, i + 1));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(0, i - 1));
            return;
          }
          if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            const v = visibleOptions[activeIndex]?.value;
            if (v) selectValue(v);
          }
        }}
      />

      {shouldShow ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]"
        >
          <div className="max-h-[260px] overflow-auto py-1">
            {visibleOptions.map((opt, idx) => (
              <button
                key={`${opt.value}-${idx}`}
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                className={cn(
                  "w-full cursor-pointer border-0 bg-transparent px-3 py-2 text-left text-[13px] font-semibold text-[var(--text)]",
                  "hover:bg-[color-mix(in_oklab,var(--primary)_6%,transparent)]",
                  idx === activeIndex &&
                    "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]",
                )}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectValue(opt.value)}
              >
                {opt.label ?? opt.value}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
