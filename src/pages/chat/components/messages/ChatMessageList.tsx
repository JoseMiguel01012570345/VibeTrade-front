import { useMemo, type MouseEvent, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { cn } from '../../../../lib/cn'
import type { Thread } from '../../../../app/store/useMarketStore'
import { normalizeThreadMessages } from '../../../../utils/chat/chatMerge'
import { MessageBody, MsgMeta } from '../media/ChatMedia'

function TrustChip({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        'ml-auto shrink-0 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2 py-1 text-xs font-black text-[var(--muted)]',
        className,
      )}
      data-chat-interactive
      title="Indicador de confianza. Helper: reputación basada en historial de acciones."
    >
      {score}
    </span>
  )
}

type Me = {
  id: string
  name: string
  phone: string
  trustScore: number
  avatarUrl?: string
}

type Props = {
  listRef: RefObject<HTMLDivElement | null>
  thread: Thread
  me: Me
  selected: Record<string, boolean>
  chatActionsLocked: boolean
  toggleSelectRow: (e: MouseEvent, id: string) => void
  setLightboxUrl: (url: string) => void
  respondTradeAgreement: (threadId: string, agreementId: string, response: 'accept' | 'reject') => void
  setFocusRouteId: (id: string | null) => void
  setRailOpen: (open: boolean | ((o: boolean) => boolean)) => void
}

export function ChatMessageList({
  listRef,
  thread,
  me,
  selected,
  chatActionsLocked,
  toggleSelectRow,
  setLightboxUrl,
  respondTradeAgreement,
  setFocusRouteId,
  setRailOpen,
}: Props) {
  const store = thread.store

  const orderedMessages = useMemo(
    () => normalizeThreadMessages(thread.messages),
    [thread.messages],
  )

  return (
    <div
      ref={listRef as RefObject<HTMLDivElement>}
      className="vt-card flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[color-mix(in_oklab,var(--bg)_60%,var(--surface))] to-[var(--surface)] px-6 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {orderedMessages.map((m) => {
        const mine = m.from === 'me'
        const system = m.from === 'system'
        const agreementDoc =
          m.type === 'agreement' ? thread.contracts?.find((c) => c.id === m.agreementId) : undefined
        const isSelected = !!selected[m.id]
        const phone = mine ? me.phone : '+54 11 0000-0000'
        const trust = mine ? me.trustScore : store.trustScore
        const pendingRead = mine && 'read' in m && m.read === false
        const avatarUrl = mine ? me.avatarUrl : store.avatarUrl
        const avatarLetter = (mine ? me.name : store.name).slice(0, 1).toUpperCase()
        const waVoiceSent = mine && m.type === 'audio'
        const isAudio = m.type === 'audio'

        return (
          <div
            key={m.id}
            className={cn(
              'grid items-end gap-2.5',
              system ? 'grid-cols-1' : mine ? 'grid-cols-[minmax(0,1fr)_36px]' : 'grid-cols-[36px_minmax(0,1fr)]',
            )}
            onClick={(e) => {
              if (chatActionsLocked || system || m.type === 'agreement') return
              toggleSelectRow(e, m.id)
            }}
          >
            {!system && (
              <Link
                to={`/profile/${mine ? me.id : store.ownerUserId ?? store.id}`}
                className={cn(
                  'relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/35 bg-gradient-to-br from-[var(--primary)] to-[#7c3aed] font-black text-white',
                  mine ? 'col-start-2 justify-self-end' : 'col-start-1',
                )}
                title="Ver perfil"
                data-chat-interactive
                onClick={(e) => e.stopPropagation()}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  avatarLetter
                )}
              </Link>
            )}

            <div
              className={cn(
                isAudio
                  ? 'w-[min(420px,100%)] max-w-[420px] min-w-0 [contain:inline-size]'
                  : 'w-fit max-w-[min(920px,96%)] min-w-0',
                'break-words rounded-2xl border border-[var(--border)] px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.06)] [overflow-wrap:anywhere]',
                system && 'col-start-1 bg-[var(--surface)]',
                !system &&
                  mine &&
                  !waVoiceSent &&
                  'col-start-1 justify-self-end bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))]',
                !system && mine && waVoiceSent && 'col-start-1 justify-self-end',
                !system && !mine && 'col-start-2 bg-[var(--surface)]',
                !system && !mine && isAudio && 'w-full max-w-[420px] justify-self-stretch',
                waVoiceSent &&
                  'border-[color-mix(in_oklab,var(--primary)_32%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_20%,var(--surface))] text-[var(--text)] shadow-[0_1px_0_rgba(15,23,42,0.06)]',
                pendingRead &&
                  !waVoiceSent &&
                  'border-[color-mix(in_oklab,var(--muted)_35%,var(--border))] bg-[color-mix(in_oklab,var(--muted)_22%,var(--surface))] shadow-[0_8px_20px_rgba(15,23,42,0.05)]',
                isSelected && 'outline outline-2 outline-[color-mix(in_oklab,var(--primary)_25%,transparent)]',
              )}
            >
              {!system && (
                <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2.5 text-xs">
                  <span className="min-w-0 truncate font-black">
                    {mine ? me.name : store.name}
                  </span>
                  <span className="vt-muted shrink-0 whitespace-nowrap" data-chat-interactive>
                    {phone}
                  </span>
                  <TrustChip
                    score={trust}
                    className={
                      waVoiceSent
                        ? 'border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface))] text-[var(--muted)]'
                        : undefined
                    }
                  />
                </div>
              )}
              <MessageBody
                m={m}
                onImageOpen={setLightboxUrl}
                agreementDoc={agreementDoc}
                onAcceptAgreement={
                  m.type === 'agreement'
                    ? () => {
                        respondTradeAgreement(thread.id, m.agreementId, 'accept')
                        toast.success('Acuerdo aceptado. No puede derogarse; podés emitir otros contratos nuevos.')
                      }
                    : undefined
                }
                onRejectAgreement={
                  m.type === 'agreement'
                    ? () => {
                        respondTradeAgreement(thread.id, m.agreementId, 'reject')
                        toast('Acuerdo rechazado')
                      }
                    : undefined
                }
                canRespondAgreement={
                  m.type === 'agreement' && agreementDoc?.status === 'pending_buyer' && !chatActionsLocked
                }
                onOpenAgreementRouteSheet={
                  m.type === 'agreement' && agreementDoc?.routeSheetId
                    ? () => {
                        setFocusRouteId(agreementDoc.routeSheetId!)
                        setRailOpen(true)
                      }
                    : undefined
                }
                isMine={mine}
              />
              {'at' in m && (
                <MsgMeta at={m.at} read={'read' in m ? m.read : undefined} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
