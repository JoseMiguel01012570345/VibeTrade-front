import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { EMPTY_TRUST_LEDGER_ENTRIES } from "../store/trustLedgerTypes";
import { TrustHistoryModal } from "../../components/TrustHistoryModal";
import { cn } from "../../lib/cn";
import { getSessionToken } from "../../utils/http/sessionToken";
import { fetchMeTrustHistory } from "../../utils/trust/trustLedgerApi";

export function UserTrustHistoryButton() {
  const me = useAppStore((s) => s.me);
  const entries = useAppStore((s) =>
    me.id && me.id !== "guest"
      ? (s.userTrustLedger[me.id] ?? EMPTY_TRUST_LEDGER_ENTRIES)
      : EMPTY_TRUST_LEDGER_ENTRIES,
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !me.id || me.id === "guest") return;
    if (!getSessionToken()) return;
    let cancelled = false;
    setLoading(true);
    void fetchMeTrustHistory()
      .then((list) => {
        if (cancelled) return;
        useAppStore.setState((s) => ({
          userTrustLedger: { ...s.userTrustLedger, [me.id]: list },
        }));
      })
      .catch(() => {
        /* offline: se muestran entradas locales si las hay */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, me.id]);

  if (!me.id || me.id === "guest") return null;

  return (
    <>
      <button
        type="button"
        className={cn(
          "relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
          "shadow-[0_10px_25px_rgba(15,23,42,0.06)] hover:bg-[color-mix(in_oklab,var(--muted)_18%,var(--surface))] hover:text-[var(--text)]",
          "active:scale-[0.98]",
        )}
        aria-label="Historial de confianza de tu cuenta"
        title="Historial de confianza"
        onClick={() => setOpen(true)}
      >
        <ScrollText size={20} />
      </button>
      <TrustHistoryModal
        open={open}
        onClose={() => setOpen(false)}
        title="Historial de confianza"
        subtitle="Con sesión iniciada, el listado se sincroniza con el servidor. Sin sesión solo verás movimientos calculados en este dispositivo."
        entries={entries}
        loading={loading}
      />
    </>
  );
}
