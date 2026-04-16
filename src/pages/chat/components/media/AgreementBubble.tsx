import { FileText } from 'lucide-react'
import { statusPillNo, statusPillOk, statusPillPending } from '../../styles/formModalStyles'
import {
  agreementDeclaresMerchandise,
  agreementDeclaresService,
  type TradeAgreement,
} from '../../domain/tradeAgreementTypes'
import { hasMerchandise } from '../../domain/tradeAgreementValidation'

export function AgreementBubble({
  title,
  agreement,
  onAccept,
  onReject,
  canRespond,
  onOpenRouteSheet,
}: {
  title: string
  agreement?: TradeAgreement
  onAccept?: () => void
  onReject?: () => void
  canRespond?: boolean
  onOpenRouteSheet?: () => void
}) {
  const st = agreement?.status
  const hasRoute =
    agreement &&
    agreementDeclaresMerchandise(agreement) &&
    hasMerchandise({ merchandise: agreement.merchandise }) &&
    (agreement.routeSheetId || agreement.routeSheetUrl)
  return (
    <div
      className="max-w-full rounded-[14px] border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] px-3.5 py-3"
      data-chat-interactive
    >
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
        <FileText size={18} aria-hidden />
        <span>Acuerdo de compra</span>
      </div>
      <div className="mt-1.5 text-base font-black tracking-[-0.03em]">{title}</div>
      {agreement ? (
        <div className="mt-1.5 text-sm text-[var(--muted)]">
          {agreementDeclaresMerchandise(agreement) && agreementDeclaresService(agreement)
            ? 'Mercancías y servicios'
            : agreementDeclaresMerchandise(agreement)
              ? 'Solo mercancías'
              : agreementDeclaresService(agreement)
                ? 'Solo servicios'
                : 'Sin bloques declarados'}
        </div>
      ) : (
        <div className="vt-muted">Cargando detalle…</div>
      )}
      {st === 'pending_buyer' ? (
        <div className="mt-2">
          <span className={statusPillPending}>Pendiente de comprador</span>
        </div>
      ) : null}
      {st === 'accepted' ? (
        <div className="mt-2">
          <span className={statusPillOk}>Aceptado · no revocable</span>
        </div>
      ) : null}
      {st === 'rejected' ? (
        <div className="mt-2">
          <span className={statusPillNo}>Rechazado</span>
        </div>
      ) : null}
      {hasRoute ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {agreement?.routeSheetId && onOpenRouteSheet ? (
            <button type="button" className="vt-btn vt-btn-sm" onClick={onOpenRouteSheet}>
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
      {canRespond && st === 'pending_buyer' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="vt-btn vt-btn-primary vt-btn-sm" onClick={onAccept}>
            Aceptar acuerdo
          </button>
          <button type="button" className="vt-btn vt-btn-sm" onClick={onReject}>
            Rechazar
          </button>
        </div>
      ) : null}
    </div>
  )
}
