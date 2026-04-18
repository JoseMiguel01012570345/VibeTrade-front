import { useMemo, useRef, useState } from 'react'
import { Heart, Send, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../lib/cn'
import type { Offer, StoreBadge } from '../../app/store/marketStoreTypes'
import { useAppStore, type User } from '../../app/store/useAppStore'
import { useMarketStore } from '../../app/store/useMarketStore'
import { toggleOfferQaCommentLike } from '../../utils/market/offerEngagementApi'
import { errorToUserMessage } from '../../utils/http/apiErrorMessage'
import {
  normalizeOfferComments,
  resolveOfferCommentAuthorLabel,
  type OfferCommentNorm,
} from "./offerComments";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return `hace ${Math.floor(s / 86400)} d`
}

function TrustChip({ score, title }: { score: number; title: string }) {
  return (
    <span
      className="rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2 py-1 text-[11px] text-[var(--muted)]"
      title={title}
    >
      Confianza: <b>{score}</b>
    </span>
  )
}

type Props = {
  offer: Offer
  store: StoreBadge
  me: User
  isOwnOffer: boolean
  submitOfferQuestion: (
    offerId: string,
    askedBy: { id: string; name: string; trustScore: number },
    question: string,
    options?: { parentId?: string | null },
  ) => Promise<void>
}

export function OfferCommentsSection({
  offer,
  store,
  me,
  isOwnOffer,
  submitOfferQuestion,
}: Props) {
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames)
  const refreshOfferQaFromServer = useMarketStore((s) => s.refreshOfferQaFromServer)
  const [draft, setDraft] = useState('')
  const [replyingTo, setReplyingTo] = useState<OfferCommentNorm | null>(null)
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const comments = useMemo(() => normalizeOfferComments(offer), [offer])

  const tree = useMemo(() => {
    const byParent = new Map<string | null, OfferCommentNorm[]>()
    for (const c of comments) {
      const k = c.parentId
      if (!byParent.has(k)) byParent.set(k, [])
      byParent.get(k)!.push(c)
    }
    for (const arr of byParent.values()) arr.sort((a, b) => a.createdAt - b.createdAt)
    return byParent
  }, [comments])

  const nameCtx = useMemo(
    () => ({ viewerId: me.id, viewerName: me.name, profileDisplayNames }),
    [me.id, me.name, profileDisplayNames],
  )

  async function toggleCommentLike(c: OfferCommentNorm) {
    if (c.id.endsWith("_legacy_ans")) return
    try {
      await toggleOfferQaCommentLike(offer.id, c.id)
      await refreshOfferQaFromServer(offer.id)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'No se pudo actualizar el me gusta.',
      )
    }
  }

  async function submit() {
    const t = draft.trim()
    if (!t) return
    if (isOwnOffer && !replyingTo) return
    setSending(true)
    try {
      await submitOfferQuestion(
        offer.id,
        {
          id: me.id,
          name: me.name?.trim() || 'Anónimo',
          trustScore: me.trustScore,
        },
        t,
        { parentId: replyingTo?.id ?? null },
      )
      toast.success(replyingTo ? 'Respuesta enviada' : 'Comentario enviado')
      setDraft('')
      setReplyingTo(null)
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight }),
      )
    } catch (e) {
      toast.error(errorToUserMessage(e, 'No se pudo enviar. Probá de nuevo.'))
    } finally {
      setSending(false)
    }
  }

  function renderThread(parentId: string | null, depth: number) {
    const rows = tree.get(parentId) ?? []
    return rows.map((c) => {
      const childRows = tree.get(c.id) ?? []
      const hasReplies = childRows.length > 0
      const isSellerComment = store.ownerUserId != null && c.author.id === store.ownerUserId
      const authorLabel = resolveOfferCommentAuthorLabel(c.author, nameCtx)
      const trustScore = c.author.id === me.id ? me.trustScore : c.author.trustScore
      return (
        <div key={c.id} className="mb-1 min-w-0">
          <div
            className={cn(
              'box-border flex gap-2.5 py-2.5 pb-1.5',
              depth > 0 && 'pt-1.5',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-black">{authorLabel}</span>
                {isSellerComment ? (
                  <span className="rounded-full border border-[color-mix(in_oklab,var(--good)_35%,var(--border))] bg-[color-mix(in_oklab,var(--good)_10%,transparent)] px-2 py-0.5 text-[10px] font-black text-[var(--text)]">
                    Vendedor
                  </span>
                ) : null}
                <TrustChip
                  score={trustScore}
                  title="Indicador de confianza del autor."
                />
                <span className="text-[11px] text-[var(--muted)]">{timeAgo(c.createdAt)}</span>
              </div>
              <div className="my-1.5 flex items-start gap-2">
                {!c.id.endsWith("_legacy_ans") ? (
                  <button
                    type="button"
                    className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-2 py-0.5 text-[11px] font-extrabold text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_8%,var(--surface))]"
                    title={c.viewerLiked ? "Quitar me gusta" : "Me gusta"}
                    onClick={() => void toggleCommentLike(c)}
                  >
                    <Heart
                      size={14}
                      className={cn(
                        c.viewerLiked &&
                          "fill-[color-mix(in_oklab,var(--bad)_55%,#f43f5e)] text-[color-mix(in_oklab,var(--bad)_55%,#f43f5e)]",
                      )}
                      aria-hidden
                    />
                    <span className="tabular-nums">{c.likeCount ?? 0}</span>
                  </button>
                ) : null}
                <p className="my-0 min-w-0 flex-1 break-words text-sm leading-snug text-[var(--text)] [overflow-wrap:break-word]">
                  {c.text}
                </p>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="border-0 bg-transparent p-0 text-xs font-extrabold text-[var(--primary)] hover:underline"
                  onClick={() => {
                    setReplyingTo(c)
                    inputRef.current?.focus()
                  }}
                >
                  Responder
                </button>
              </div>
            </div>
          </div>
          {hasReplies ? (
            <div
              className="my-0.5 mb-1 ml-0 border-l-2 border-[color-mix(in_oklab,var(--muted)_48%,var(--border))] pl-3"
              role="group"
              aria-label="Respuestas en este hilo"
            >
              {renderThread(c.id, depth + 1)}
            </div>
          ) : null}
        </div>
      )
    })
  }

  const composerLocked = isOwnOffer && !replyingTo

  return (
    <div id="offer-comments" className="vt-card vt-card-pad">
      <div className="vt-h2">Comentarios públicos</div>
      <div className="vt-muted mt-1.5">
        Mismo hilo que en el chat al abrir la compra: identidad y confianza visibles. El vendedor
        responde con «Responder» (no puede iniciar un hilo nuevo en su propia ficha).
      </div>
      <div className="vt-divider my-3" />

      <div
        className="mb-3 max-h-[min(52vh,420px)] min-h-[120px] overflow-y-auto overflow-x-hidden rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] px-3 py-2.5 [scrollbar-width:thin]"
        ref={listRef}
      >
        {comments.length === 0 ? (
          <div className="vt-muted py-4 text-center text-sm">Aún no hay comentarios.</div>
        ) : (
          renderThread(null, 0)
        )}
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] px-3 py-2.5">
        {replyingTo ? (
          <div className="mb-2.5 flex items-start justify-between gap-2 rounded-xl border-l-4 border-l-[#25d366] bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))] px-2.5 py-2">
            <div className="flex min-w-0 flex-1 gap-2">
              <span
                className="w-0.5 shrink-0 rounded-sm bg-gradient-to-b from-[#25d366] to-[var(--primary)]"
                aria-hidden
              />
              <div>
                <span className="block text-xs font-extrabold text-green-700">
                  Respondiendo a {resolveOfferCommentAuthorLabel(replyingTo.author, nameCtx)}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                  {replyingTo.text}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0.5 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_10%,transparent)] hover:text-[var(--text)]"
              aria-label="Cancelar respuesta"
              onClick={() => setReplyingTo(null)}
            >
              <X size={18} />
            </button>
          </div>
        ) : null}
        {composerLocked ? (
          <p className="mb-2 text-xs text-[var(--muted)]">
            Como vendedor, usá <strong>Responder</strong> en un comentario para publicar aquí.
          </p>
        ) : null}
        <div className="flex items-stretch gap-2.5">
          <input
            ref={inputRef}
            className="vt-input min-w-0 flex-1"
            disabled={sending || composerLocked}
            placeholder={
              composerLocked
                ? 'Elegí «Responder» en un comentario…'
                : replyingTo
                  ? 'Escribe una respuesta…'
                  : 'Escribe un comentario…'
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void submit()
              }
            }}
          />
          <button
            type="button"
            className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-gradient-to-br from-[var(--primary)] to-[color-mix(in_oklab,var(--primary)_75%,#7c3aed)] text-white shadow-[0_6px_16px_color-mix(in_oklab,var(--primary)_30%,transparent)] hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Enviar"
            title="Enviar"
            disabled={sending || composerLocked || !draft.trim()}
            onClick={() => void submit()}
          >
            <Send size={20} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  )
}
