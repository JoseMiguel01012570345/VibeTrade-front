import { ShieldCheck } from "lucide-react";
import { cn } from "../lib/cn";

const TRUST_MAX = 100;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function StoreTrustMini({
  score,
  className,
  ariaLabel,
}: Readonly<{
  score: number;
  className?: string;
  /** Por defecto: confianza de tienda; usa p. ej. "Confianza del usuario" para el dueño. */
  ariaLabel?: string;
}>) {
  const safe = Number.isFinite(score) ? score : 0;
  const pct = (clamp(safe, 0, TRUST_MAX) / TRUST_MAX) * 100;

  return (
    <div
      className={cn("min-w-0", className)}
      aria-label={ariaLabel ?? "Confianza de la tienda"}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
          <ShieldCheck size={12} aria-hidden /> Confianza
        </div>
        <div className="text-[11px] font-black tabular-nums text-[var(--text)]">
          {Math.round(safe)}/{TRUST_MAX}
        </div>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]">
        <div
          className="h-full rounded-full bg-[color-mix(in_oklab,var(--primary)_65%,#22c55e)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

