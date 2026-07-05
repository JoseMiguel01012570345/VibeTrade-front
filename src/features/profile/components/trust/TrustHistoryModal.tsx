import { cn } from "@shared/lib/cn";
import { CeModal, CeSpinner } from "@shared/components/ui";
import type { TrustHistoryEntry } from "@features/profile/Dtos/trustLedgerTypes";
import { fmtTrustHistoryWhen } from "@features/profile/logic/trustHistoryFormat";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  entries: TrustHistoryEntry[];
  onClose: () => void;
  /** Mientras se obtiene el historial desde el API. */
  loading?: boolean;
};

export function TrustHistoryModal({
  open,
  title,
  subtitle,
  entries,
  onClose,
  loading = false,
}: Props) {
  return (
    <CeModal show={open} onClose={onClose} title={title} size="md">
      {subtitle ? (
        <p className="vt-muted mb-3 text-[12px] leading-snug">{subtitle}</p>
      ) : null}
      {loading && entries.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[var(--muted)]">
          <CeSpinner size="md" aria-label="Cargando historial" />
          Cargando historial…
        </div>
      ) : entries.length === 0 ? (
        <p className="vt-muted py-6 text-center text-[13px] leading-snug">
          Todavía no hay movimientos registrados en la barra de confianza.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <time
                  className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]"
                  dateTime={new Date(e.at).toISOString()}
                >
                  {fmtTrustHistoryWhen(e.at)}
                </time>
                <span
                  className={cn(
                    "text-sm font-black tabular-nums",
                    e.delta > 0 && "text-[color-mix(in_oklab,var(--good)_75%,var(--text))]",
                    e.delta < 0 && "text-[color-mix(in_oklab,var(--bad)_80%,var(--text))]",
                    e.delta === 0 && "text-[var(--muted)]",
                  )}
                >
                  {e.delta > 0 ? "+" : ""}
                  {e.delta} pts
                </span>
              </div>
              <p className="mt-1.5 text-[13px] leading-snug text-[var(--text)]">
                {e.reason}
              </p>
              <p className="vt-muted mt-1 text-[11px]">
                Saldo después:{" "}
                <span className="font-bold text-[var(--text)] tabular-nums">
                  {e.balanceAfter}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </CeModal>
  );
}
