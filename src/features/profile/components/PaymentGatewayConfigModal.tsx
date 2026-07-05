import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { CeButton, CeModal, CeSpinner } from "@shared/components/ui";
import {
  useCreateSetupIntentMutation,
  usePaymentGatewayConfig,
  useSavedCards,
} from "@features/payments/hooks/usePaymentGatewayQueries";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PaymentGatewayConfigModal({ open, onClose }: Props) {
  const configQuery = usePaymentGatewayConfig(open);
  const config = configQuery.data;
  const enabled = config?.enabled ?? false;
  const simulatedMode = config?.simulatedMode ?? true;
  const cardsQuery = useSavedCards({ enabled: open && enabled });
  const setupMutation = useCreateSetupIntentMutation();

  const loading = configQuery.isLoading;
  const cards = cardsQuery.data ?? [];
  const cardsLoading = cardsQuery.isLoading || cardsQuery.isFetching;
  const busy = setupMutation.isPending;

  return (
    <CeModal
      show={open}
      onClose={() => !busy && onClose()}
      title={
        <span className="flex items-center gap-2">
          <CreditCard size={18} aria-hidden /> Pagos (simulado)
        </span>
      }
      size="lg"
      footer={
        <CeButton color="gray" outline disabled={busy} onClick={onClose}>
          Cerrar
        </CeButton>
      }
    >
      <p className="vt-muted mb-3 text-[12px] leading-snug">
        Pasarela demo: activá una tarjeta de prueba para usarla en checkout.
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[var(--muted)]">
          <CeSpinner size="md" aria-label="Cargando configuración" />
          Cargando configuración…
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] p-3">
            <div className="text-[12px] font-black uppercase tracking-wide text-[var(--muted)]">
              Tarjetas guardadas
            </div>
            {simulatedMode ? (
              <p className="vt-muted mt-2 text-[12px]">
                Modo simulado ({enabled ? "activo" : "inactivo"}).
              </p>
            ) : null}
            {cardsLoading ? (
              <div className="vt-muted mt-2 flex items-center gap-2 text-[13px]">
                <CeSpinner size="sm" aria-label="Cargando tarjetas" />
                Cargando tarjetas…
              </div>
            ) : cards.length === 0 ? (
              <p className="vt-muted mt-2 text-[13px]">
                Todavía no hay tarjetas guardadas.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {cards.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-[var(--text)]">
                        {c.brand || "Card"} •••• {c.last4}
                      </div>
                      <div className="vt-muted text-[12px]">
                        Exp {String(c.expMonth).padStart(2, "0")}/{c.expYear}
                      </div>
                    </div>
                    <span className="vt-muted font-mono text-[11px]" title={c.id}>
                      {c.id}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3">
              <CeButton
                loading={setupMutation.isPending}
                onClick={async () => {
                  if (!enabled) {
                    toast.error("Pagos no están activos en el servidor.");
                    return;
                  }
                  try {
                    await setupMutation.mutateAsync();
                    toast.success("Tarjeta demo activada.");
                  } catch (e) {
                    toast.error(
                      (e as Error)?.message ?? "No se pudo activar la tarjeta demo.",
                    );
                  }
                }}
              >
                Activar tarjeta demo
              </CeButton>
            </div>
          </div>
        </div>
      )}
    </CeModal>
  );
}
