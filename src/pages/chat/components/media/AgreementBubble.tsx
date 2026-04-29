import { FileText } from "lucide-react";
import { cn } from "../../../../lib/cn";
import {
  statusPillNo,
  statusPillOk,
  statusPillPending,
} from "../../styles/formModalStyles";
import {
  agreementDeclaresMerchandise,
  agreementDeclaresService,
  type TradeAgreement,
} from "../../domain/tradeAgreementTypes";
import { hasMerchandise } from "../../domain/tradeAgreementValidation";

export function AgreementBubble({
  title,
  agreement,
  onAccept,
  onReject,
  canRespond,
  viewerIsBuyer,
  onOpenRouteSheet,
}: {
  title: string;
  agreement?: TradeAgreement;
  onAccept?: () => void;
  onReject?: () => void;
  canRespond?: boolean;
  /** Si el mensaje lo ve el comprador, el texto de «pendiente» usa segunda persona («tu respuesta»), no «del comprador». */
  viewerIsBuyer?: boolean;
  onOpenRouteSheet?: () => void;
}) {
  const st = agreement?.status;
  const isDeleted = st === "deleted";
  const hasRoute =
    !isDeleted &&
    agreement &&
    agreementDeclaresMerchandise(agreement) &&
    hasMerchandise({ merchandise: agreement.merchandise }) &&
    (agreement.routeSheetId || agreement.routeSheetUrl);
  return (
    <div
      className={cn(
        "max-w-full rounded-[14px] border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] px-3.5 py-3",
        isDeleted &&
          "opacity-85 [border-color:color-mix(in_oklab,var(--muted)_40%,var(--border))] bg-[color-mix(in_oklab,var(--muted)_10%,var(--surface))]",
      )}
      data-chat-interactive
    >
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
        <FileText size={18} aria-hidden />
        <span>Acuerdo de compra</span>
      </div>
      <div
        className={cn(
          "mt-1.5 text-base font-black tracking-[-0.03em]",
          isDeleted && "line-through opacity-80",
        )}
      >
        {title}
      </div>
      {agreement ? (
        <div className="mt-1.5 text-sm text-[var(--muted)]">
          {isDeleted
            ? "Este acuerdo fue eliminado por el vendedor. Se conserva el registro en el hilo."
            : agreementDeclaresMerchandise(agreement) &&
                agreementDeclaresService(agreement)
              ? "Mercancías y servicios"
              : agreementDeclaresMerchandise(agreement)
                ? "Solo mercancías"
                : agreementDeclaresService(agreement)
                  ? "Solo servicios"
                  : "Sin bloques declarados"}
        </div>
      ) : (
        <div className="vt-muted">Cargando detalle…</div>
      )}
      {isDeleted ? (
        <div className="mt-2">
          <span className={statusPillNo}>Eliminado</span>
        </div>
      ) : null}
      {st === "pending_buyer" && !canRespond ? (
        <div className="mt-2">
          <span className={statusPillPending}>
            {viewerIsBuyer
              ? "Tu respuesta pendiente"
              : "Pendiente de respuesta del comprador"}
          </span>
        </div>
      ) : null}
      {st === "accepted" ? (
        <div className="mt-2">
          <span className={statusPillOk}>Aceptado · no revocable</span>
        </div>
      ) : null}
      {st === "rejected" ? (
        <div className="mt-2">
          <span className={statusPillNo}>Rechazado</span>
        </div>
      ) : null}
      {hasRoute ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {agreement?.routeSheetId && onOpenRouteSheet ? (
            <button
              type="button"
              className="vt-btn vt-btn-sm"
              onClick={onOpenRouteSheet}
            >
              Ver hoja de ruta
            </button>
          ) : null}
          {agreement?.routeSheetUrl ? (
            <a
              href={agreement.routeSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="vt-btn vt-btn-sm"
              onClick={(e) => e.stopPropagation()}
            >
              Enlace externo
            </a>
          ) : null}
        </div>
      ) : null}
      {canRespond && st === "pending_buyer" ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm leading-snug text-[var(--muted)]">
            Confirma la compra según este acuerdo o rechaza la propuesta.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="vt-btn vt-btn-primary vt-btn-sm"
              onClick={onAccept}
            >
              Comprar
            </button>
            <button
              type="button"
              className="vt-btn vt-btn-sm"
              onClick={onReject}
            >
              Rechazar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
