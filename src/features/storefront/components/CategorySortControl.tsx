import { useEffect, useRef, useState } from "react";
import type { SortMode } from "../logic/storefrontTypes";

export function CategorySortControl({
  options,
  value,
  onChange,
  selectedLabel,
}: Readonly<{
  options: { value: SortMode; label: string }[];
  value: SortMode;
  onChange: (value: SortMode) => void;
  selectedLabel: string;
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative min-w-0 w-full max-w-sm sm:max-w-none">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-14 w-full items-center justify-between gap-4 rounded-[16px] border border-[#d9d5cf] bg-white px-5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(33,37,41,0.04)] transition hover:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.55rem)] z-20 w-full min-w-[15rem] overflow-hidden rounded-[18px] border border-[#e5ddd5] bg-white p-2 shadow-[0_20px_44px_rgba(33,37,41,0.12)]">
          <div className="space-y-1" role="listbox" aria-label="Ordenar">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-[12px] px-4 py-3 text-left text-sm font-medium transition ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-stone-50"
                  }`}
                  role="option"
                  aria-selected={active}
                >
                  <span>{option.label}</span>
                  {active ? (
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
