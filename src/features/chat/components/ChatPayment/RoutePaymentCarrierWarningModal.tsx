import { AlertTriangle } from "lucide-react";
import { onBackdropPointerClose } from "@shared/lib/modals/modalClose";
import { modalShellWide } from "@shared/styles/modals/formModalStyles";

type Props = Readonly<{
  open: boolean;
  routeSheetTitle: string;
  onAcknowledge: () => void;
}>;

export function RoutePaymentCarrierWarningModal({
  open,
  routeSheetTitle,
  onAcknowledge,
}: Props) {
  if (!open) return null;

  const title = routeSheetTitle.trim() || "la hoja vinculada";

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-carrier-warning-title"
      onMouseDown={(e) => onBackdropPointerClose(e, onAcknowledge)}
    >
      <div
        className={modalShellWide}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          id="route-carrier-warning-title"
          className="vt-modal-title flex items-center gap-2 text-amber-700 dark:text-amber-400"
        >
          <AlertTriangle size={18} aria-hidden />
          Transporte aún no disponible para cobrar
        </div>
        <p className="vt-muted text-[13px] leading-snug">
          El acuerdo tiene la hoja de ruta{" "}
          <strong className="text-[var(--text)]">«{title}»</strong> vinculada, pero
          el transporte todavía no se puede incluir en un cobro porque{" "}
          <strong className="text-[var(--text)]">
            no hay transportistas confirmados
          </strong>{" "}
          en todos los tramos con precio.
        </p>
        <p className="vt-muted mt-2 text-[12px] leading-snug">
          El vendedor debe publicar la hoja e invitar transportistas; cada uno
          debe aceptar la invitación. Cuando estén confirmados, vas a ver la
          sección «Transporte (hoja de ruta)» en este modal y podrás pagar el
          recorrido.
        </p>
        <div className="vt-modal-actions mt-4">
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={onAcknowledge}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
