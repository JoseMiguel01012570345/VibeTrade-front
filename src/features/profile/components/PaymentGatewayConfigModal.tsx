import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { CeSpinner } from "@shared/components/ui";
import {
  useCreateSetupIntentMutation,
  usePaymentGatewayConfig,
  useSavedCards,
} from "@features/payments/hooks/usePaymentGatewayQueries";
import {
  profileFieldLabelClass,
  profilePanelClass,
  profileSectionMutedClass,
} from "@features/profile/logic/profileTabStyles";
import { ProfileButton } from "./ProfileButton";
import { ProfileModal } from "./ProfileModal";

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
    <ProfileModal
      show={open}
      onClose={() => !busy && onClose()}
      title={
        <span className="flex items-center gap-2">
          <CreditCard size={18} aria-hidden /> Pagos (simulado)
        </span>
      }
      size="lg"
      footer={
        <ProfileButton variant="secondary" disabled={busy} onClick={onClose}>
          Cerrar
        </ProfileButton>
      }
    >
      <p className={`${profileSectionMutedClass} mb-4`}>
        Pasarela demo: activá una tarjeta de prueba para usarla en checkout.
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[var(--muted)]">
          <CeSpinner size="md" aria-label="Cargando configuración" />
          Cargando configuración…
        </div>
      ) : (
        <div className={profilePanelClass}>
          <div className={profileFieldLabelClass}>Tarjetas guardadas</div>
          {simulatedMode ? (
            <p className={`${profileSectionMutedClass} mt-2`}>
              Modo simulado ({enabled ? "activo" : "inactivo"}).
            </p>
          ) : null}
          {cardsLoading ? (
            <div className={`${profileSectionMutedClass} mt-2 flex items-center gap-2`}>
              <CeSpinner size="sm" aria-label="Cargando tarjetas" />
              Cargando tarjetas…
            </div>
          ) : cards.length === 0 ? (
            <p className={`${profileSectionMutedClass} mt-2`}>
              Todavía no hay tarjetas guardadas.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {cards.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="font-extrabold text-[var(--text)]">
                      {c.brand || "Card"} •••• {c.last4}
                    </div>
                    <div className={profileSectionMutedClass}>
                      Exp {String(c.expMonth).padStart(2, "0")}/{c.expYear}
                    </div>
                  </div>
                  <span
                    className={`${profileSectionMutedClass} font-mono text-[11px]`}
                    title={c.id}
                  >
                    {c.id}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <ProfileButton
              variant="primary"
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
            </ProfileButton>
          </div>
        </div>
      )}
    </ProfileModal>
  );
}
