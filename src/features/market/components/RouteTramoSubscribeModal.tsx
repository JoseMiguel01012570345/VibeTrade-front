import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { CeButton, CeModal } from "@shared/components/ui";
import { cn } from "@shared/lib/cn";
import type { UserTransportServiceOption } from "@features/market/logic/transportEligibility";

type Props = {
  open: boolean;
  onClose: () => void;
  services: UserTransportServiceOption[];
  initialServiceId: string | null;
  /** Texto breve del tramo elegido (p. ej. orden y ruta). */
  stopSummary: string;
  submitting?: boolean;
  onConfirm: (storeServiceId: string) => void;
};

export function RouteTramoSubscribeModal({
  open,
  onClose,
  services,
  initialServiceId,
  stopSummary,
  submitting = false,
  onConfirm,
}: Props) {
  const [pick, setPick] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const d =
      initialServiceId && services.some((s) => s.serviceId === initialServiceId)
        ? initialServiceId
        : (services[0]?.serviceId ?? "");
    setPick(d);
  }, [open, initialServiceId, services]);

  return (
    <CeModal
      show={open}
      onClose={() => !submitting && onClose()}
      title={
        <span className="flex items-center gap-2">
          <Truck size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
          Servicio de transporte
        </span>
      }
      size="lg"
      bodyClassName="pt-2"
      footer={
        <>
          <CeButton color="gray" outline disabled={submitting} onClick={onClose}>
            Cancelar
          </CeButton>
          <CeButton
            loading={submitting}
            disabled={!pick || services.length === 0}
            onClick={() => onConfirm(pick)}
          >
            Confirmar solicitud
          </CeButton>
        </>
      }
    >
      <p className="mb-0 text-sm text-gray-600 dark:text-gray-400">
        Elige con qué servicio de <strong>tus tiendas</strong> te suscribes. El servidor comprueba que el
        servicio califique como transporte y avisa al comprador y al vendedor del hilo.
      </p>
      <p className="mt-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
        Tramo: {stopSummary}
      </p>

      {services.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--bad)]">
          No tienes servicios de transporte publicados en tus tiendas. Crea o publica uno en el catálogo.
        </p>
      ) : (
        <ul className="m-0 mt-3 max-h-[min(50vh,280px)] list-none space-y-2 overflow-y-auto p-0 pr-1">
          {services.map((s) => (
            <li key={s.serviceId}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  pick === s.serviceId
                    ? "border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]"
                    : "border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] hover:border-[color-mix(in_oklab,var(--primary)_22%,var(--border))]",
                )}
              >
                <input
                  type="radio"
                  name="route-tramo-svc"
                  className="mt-1"
                  checked={pick === s.serviceId}
                  disabled={submitting}
                  onChange={() => setPick(s.serviceId)}
                />
                <span className="min-w-0 text-[13px] font-semibold leading-snug">{s.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </CeModal>
  );
}
