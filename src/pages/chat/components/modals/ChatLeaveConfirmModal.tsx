import { modalShellNarrow } from '../../styles/formModalStyles'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  /** Si true, el texto menciona hilo (lista) y la pérdida de acceso al salir. */
  variant?: 'page' | 'list'
}

export function ChatLeaveConfirmModal({ open, onClose, onConfirm, variant = 'page' }: Props) {
  if (!open) return null

  const listExtra =
    variant === 'list' ? (
      <span>
        {' '}
        Además, al confirmar, <strong className="text-[var(--text)]">dejás de formar parte de este hilo</strong>: dejará
        de mostrarse en la lista y no podrás reabrir el mismo hilo.
      </span>
    ) : null

  return (
    <div className="vt-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="chat-leave-title">
      <div className={modalShellNarrow}>
        <div id="chat-leave-title" className="vt-modal-title">
          ¿Salir del chat?
        </div>
        <p className="vt-muted mb-4 text-[13px] leading-snug text-[var(--text)]">
          Los demás participantes verán un aviso de que saliste de la conversación.{listExtra}
        </p>
        <p className="vt-muted mb-0 text-[12px] leading-snug">
          Si solo querés volver atrás sin avisar, usá «Volver» o navegá a otra pantalla.
        </p>
        <div className="vt-modal-actions mt-5">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={() => {
              void (async () => {
                await Promise.resolve(onConfirm())
                onClose()
              })()
            }}
          >
            Sí, salir
          </button>
        </div>
      </div>
    </div>
  )
}
