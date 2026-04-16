import { MAX_REASONABLE_PRICE } from "../../utils/market/parseProductPrice";

export function PriceRangeMinMaxControls({
  priceSliderMax,
  priceFloor,
  priceCeiling,
  onPriceFloor,
  onPriceCeiling,
  helperText,
}: Readonly<{
  priceSliderMax: number;
  priceFloor: number | null;
  priceCeiling: number | null;
  onPriceFloor: (v: number) => void;
  onPriceCeiling: (v: number) => void;
  helperText?: string;
}>) {
  const effMax = Math.max(
    0,
    Math.min(
      Number.isFinite(priceSliderMax) ? priceSliderMax : 0,
      MAX_REASONABLE_PRICE,
    ),
  );
  const step = effMax > 500 ? Math.ceil(effMax / 500) : 1;
  const cap = Math.min(priceCeiling ?? effMax, effMax);
  const fl = Math.min(Math.max(priceFloor ?? 0, 0), cap);
  const disabled = effMax <= 0;
  return (
    <div className="mt-2 space-y-3">
      {helperText ? (
        <p className="vt-muted text-[11px] leading-snug">{helperText}</p>
      ) : null}
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
          Precio mínimo
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <input
            type="range"
            className="min-w-0 flex-1 accent-[var(--primary)] disabled:opacity-40"
            min={0}
            max={Math.min(cap, effMax)}
            step={step}
            value={disabled ? 0 : fl}
            disabled={disabled}
            onChange={(e) => onPriceFloor(Number(e.target.value))}
            aria-label="Precio mínimo"
          />
          <span className="shrink-0 text-[12px] font-bold tabular-nums">
            {disabled ? "—" : fl.toLocaleString("es-AR")}
          </span>
        </div>
      </div>
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
          Precio máximo
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <input
            type="range"
            className="min-w-0 flex-1 accent-[var(--primary)] disabled:opacity-40"
            min={fl}
            max={effMax}
            step={step}
            value={disabled ? 0 : Math.min(cap, effMax)}
            disabled={disabled}
            onChange={(e) => onPriceCeiling(Number(e.target.value))}
            aria-label="Precio máximo"
          />
          <span className="shrink-0 text-[12px] font-bold tabular-nums">
            {disabled ? "—" : cap.toLocaleString("es-AR")}
          </span>
        </div>
      </div>
    </div>
  );
}
