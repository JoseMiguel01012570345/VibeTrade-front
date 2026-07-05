import { FileText } from "lucide-react";
import { cn } from "@shared/lib/cn";
import {
  statusPillNo,
  statusPillOk,
  statusPillPending,
} from '@shared/styles/modals/formModalStyles';
import type { TradeAgreement } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import { ChatEmbedCard } from "../embeds/ChatEmbedCard";
import { ChatEmbedFrame } from "../embeds/ChatEmbedFrame";

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
    !!agreement &&
    !!(agreement.routeSheetId || agreement.routeSheetUrl);

  const statusFooter = (
    <>
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
              data-chat-interactive
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
              data-chat-interactive
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
              data-chat-interactive
            >
              Comprar
            </button>
            <button
              type="button"
              className="vt-btn vt-btn-sm"
              onClick={onReject}
              data-chat-interactive
            >
              Rechazar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <ChatEmbedCard
      className={cn(
        "max-w-full",
        isDeleted &&
          "opacity-85 [border-color:color-mix(in_oklab,var(--muted)_40%,var(--border))] bg-[color-mix(in_oklab,var(--muted)_10%,var(--surface))]",
      )}
      frame={
        <ChatEmbedFrame
          aspect="square"
          fallback={<FileText size={32} strokeWidth={1.75} aria-hidden />}
        />
      }
      header={
        <div className="mb-1.5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
          <FileText size={16} aria-hidden />
          <span>Acuerdo de compra</span>
        </div>
      }
      title={
        <span className={cn(isDeleted && "line-through opacity-80")}>{title}</span>
      }
      description={
        agreement
          ? isDeleted
            ? "Este acuerdo fue eliminado por el vendedor. Se conserva el registro en el hilo."
            : "Servicios"
          : "Cargando detalle…"
      }
      footer={statusFooter}
    />
  );
}
