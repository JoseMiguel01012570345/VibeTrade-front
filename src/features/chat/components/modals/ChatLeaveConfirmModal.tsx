import { modalShellNarrow } from '@shared/styles/modals/formModalStyles'

type Props = {
  open: boolean
  onClose: () => void
  /** Si retorna false, el modal permanece abierto (Ãºtil para errores de servidor). */
  onConfirm: () => void | Promise<boolean | void>
  /** Si true, el texto menciona hilo (lista) y la pÃ©rdida de acceso al salir. */
  variant?: 'page' | 'list'
  blockingCode?: string | null
  blockingMessage?: string | null
  refundSuggestion?: {
    threadId: string
    agreementId: string
    routeSheetId: string
    routeStopId: string
  } | null
  refundBusy?: boolean
  onRequestRefund?: () => void | Promise<void>
}

export function ChatLeaveConfirmModal({
  open,
  onClose,
  onConfirm,
  variant = 'page',
  blockingCode,
  blockingMessage,
  refundSuggestion,
  refundBusy,
  onRequestRefund,
}: Props) {
  if (!open) return null

  const listExtra =
    variant === 'list' ? (
      <span>
        {' '}
        AdemÃ¡s, al confirmar, <strong className="text-[var(--text)]">dejÃ¡s de formar parte de este hilo</strong>: dejarÃ¡
        de mostrarse en la lista y no podrÃ¡s reabrir el mismo hilo.
      </span>
    ) : null

  return (
    <div className="vt-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="chat-leave-title">
      <div className={modalShellNarrow}>
        <div id="chat-leave-title" className="vt-modal-title">
          Â¿Salir del chat?
        </div>
        <p className="vt-muted mb-4 text-[13px] leading-snug text-[var(--text)]">
          Los demÃ¡s participantes verÃ¡n un aviso de que saliste de la conversaciÃ³n.{listExtra}
        </p>
        {blockingCode ?
          <div className="mb-4 rounded-xl border border-[color-mix(in_oklab,var(--bad)_42%,var(--border))] bg-[color-mix(in_oklab,var(--bad)_10%,var(--surface))] px-3 py-2 text-[12px] leading-snug text-[var(--text)]">
            <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
              Salida bloqueada
            </div>
            <div className="mt-1 font-bold">{blockingMessage ?? blockingCode}</div>
            {blockingCode === 'route_delivery_active_buyer' ||
            blockingCode === 'route_delivery_active_seller' ?
              <p className="vt-muted mt-2 mb-0 text-[12px] leading-snug">
                Mientras haya entregas activas (pagadas/en curso), tenÃ©s que esperar la evidencia o gestionar un
                reembolso elegible del tramo con la contraparte.
              </p>
            : null}
          </div>
        : null}

        {refundSuggestion && onRequestRefund ?
          <div className="mb-4 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2 text-[12px] leading-snug">
            <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
              Reembolso del tramo (si aplica)
            </div>
            <p className="vt-muted mt-1 mb-2 text-[12px] leading-snug">
              Si el servidor marcÃ³ el tramo como elegible para reembolso, podÃ©s intentar solicitarlo aquÃ­ (comprador o
              vendedor).
            </p>
            <button
              type="button"
              className="vt-btn vt-btn-primary w-full justify-center"
              disabled={Boolean(refundBusy)}
              onClick={() => void onRequestRefund()}
            >
              {refundBusy ? 'Solicitandoâ€¦' : 'Solicitar reembolso del tramo'}
            </button>
          </div>
        : null}

        <p className="vt-muted mb-0 text-[12px] leading-snug">
          Si solo quieres volver atrÃ¡s sin avisar, usa Â«VolverÂ» o navega a otra pantalla.
        </p>
        <div className="vt-modal-actions mt-5">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            disabled={Boolean(blockingCode)}
            onClick={() => {
              void (async () => {
                const r = await Promise.resolve(onConfirm())
                if (r === false) return
                onClose()
              })()
            }}
          >
            SÃ­, salir
          </button>
        </div>
      </div>
    </div>
  )
}
