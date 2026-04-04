import { MapPin } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import type { Message } from '../../../../app/store/useMarketStore'
import type { TradeAgreement } from '../../domain/tradeAgreementTypes'
import { AgreementBubble } from './AgreementBubble'
import { AudioMicro } from './AudioMicro'
import { ChatReplyQuotes } from './ChatReplyQuotes'
import { DocGrid, DocRow } from './DocRow'
import { hhmm } from './MsgMeta'
import { ImageGrid } from './ImageGrid'
import { ytThread } from './chatMediaThreadStyles'

export function MessageBody({
  m,
  onImageOpen,
  agreementDoc,
  onAcceptAgreement,
  onRejectAgreement,
  canRespondAgreement,
  onOpenAgreementRouteSheet,
  isMine,
}: {
  m: Message
  onImageOpen: (url: string) => void
  agreementDoc?: TradeAgreement | null
  onAcceptAgreement?: () => void
  onRejectAgreement?: () => void
  canRespondAgreement?: boolean
  onOpenAgreementRouteSheet?: () => void
  isMine?: boolean
}) {
  if (m.type === 'text') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={cn('flex min-w-0 flex-col gap-2', hasThread && ytThread)}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} inThread />}
        <div className={cn(hasThread && 'pt-0.5')}>{m.text}</div>
      </div>
    )
  }
  if (m.type === 'image') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={cn('flex min-w-0 flex-col gap-2', hasThread && ytThread)}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} inThread />}
        <ImageGrid images={m.images} onOpen={onImageOpen} />
        {m.embeddedAudio ? (
          <AudioMicro
            url={m.embeddedAudio.url}
            seconds={m.embeddedAudio.seconds}
            isMine={isMine}
          />
        ) : null}
        {m.caption ? (
          <div className="m-0 break-normal text-sm leading-snug text-[var(--text)] [overflow-wrap:break-word]">{m.caption}</div>
        ) : null}
      </div>
    )
  }
  if (m.type === 'audio') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div
        className={cn(
          'flex min-w-0 w-full flex-col gap-2 overflow-hidden',
          hasThread && ytThread,
        )}
      >
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} inThread />}
        <div className={cn('min-w-0 w-full', hasThread && 'pt-0.5')}>
          <AudioMicro url={m.url} seconds={m.seconds} isMine={isMine} />
        </div>
      </div>
    )
  }
  if (m.type === 'docs') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={cn('flex min-w-0 flex-col gap-2', hasThread && ytThread)}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} inThread />}
        <DocGrid documents={m.documents} isMine={isMine} />
        {m.embeddedAudio ? (
          <AudioMicro
            url={m.embeddedAudio.url}
            seconds={m.embeddedAudio.seconds}
            isMine={isMine}
          />
        ) : null}
        {m.caption ? (
          <div className="m-0 break-normal text-sm leading-snug text-[var(--text)] [overflow-wrap:break-word]">{m.caption}</div>
        ) : null}
      </div>
    )
  }
  if (m.type === 'doc') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={cn('flex min-w-0 flex-col gap-2', hasThread && ytThread)}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} inThread />}
        <DocRow name={m.name} size={m.size} kind={m.kind} url={m.url} isMine={isMine} />
        {m.caption ? (
          <div className="m-0 break-normal text-sm leading-snug text-[var(--text)] [overflow-wrap:break-word]">{m.caption}</div>
        ) : null}
      </div>
    )
  }
  if (m.type === 'certificate')
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_65%,var(--surface))] p-3">
        <div className="font-black">{m.title}</div>
        <div className="mt-2 text-sm text-[var(--muted)]">{m.body}</div>
        <div className="mt-2.5 inline-flex items-center gap-2 text-xs text-[var(--muted)]">
          <MapPin size={14} /> {hhmm(m.at)}
        </div>
      </div>
    )
  if (m.type === 'agreement')
    return (
      <AgreementBubble
        title={m.title}
        agreement={agreementDoc ?? undefined}
        onAccept={onAcceptAgreement}
        onReject={onRejectAgreement}
        canRespond={canRespondAgreement}
        onOpenRouteSheet={onOpenAgreementRouteSheet}
      />
    )
  return null
}
