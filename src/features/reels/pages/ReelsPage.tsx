import { Bookmark, MessageCircle, Send, ThumbsUp, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@shared/lib/cn'
import { ReelCommentsPanel } from '../components/ReelCommentsPanel'
import { useReelsPage } from '../hooks/useReelsPage'

export function ReelsPage() {
  const {
    reels,
    idx,
    shareOpen,
    setShareOpen,
    commentsOpen,
    setCommentsOpen,
    reelLikes,
    dispatchReelLike,
    commentsByReel,
    viewportRef,
    canPublish,
    currentReel,
    me,
    savedReels,
    toggleSavedReel,
    addComment,
    setCommentRating,
    reelBtn,
  } = useReelsPage()

  return (
    <div className="h-[calc(100vh-120px)]">
      <div
        className="relative h-full overflow-hidden rounded-[18px] border border-[var(--border)]"
        ref={viewportRef}
        aria-label="Reels"
      >
        {reels.length > 0 ? (
          <div
            className="h-full will-change-transform transition-transform duration-[520ms] ease-[ease]"
            style={{ transform: `translateY(-${idx * 100}%)` }}
          >
            {reels.map((r) => (
              <div
                key={r.id}
                className="relative h-full overflow-hidden border-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${r.cover})` }}
              >
                <div
                  className="absolute inset-0 rounded-none bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(0,0,0,0.15),transparent),linear-gradient(180deg,rgba(2,6,23,0.25),rgba(2,6,23,0.75))]"
                  aria-hidden
                />

                <div className="container relative z-[2] pt-[18px] text-white">
                  <div className="text-[22px] font-black tracking-[-0.03em]">{r.title}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5 text-white/90">
                    {r.by} ·{' '}
                    <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1.5 text-xs text-white/95">
                      {r.category}
                    </span>
                  </div>
                </div>

                <div className="absolute right-3 top-1/2 z-[3] flex -translate-y-1/2 flex-col gap-2.5">
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      type="button"
                      className={cn(
                        reelBtn,
                        reelLikes.liked[r.id] && 'border-white/35 bg-[rgba(37,99,235,0.55)]',
                      )}
                      onClick={() => dispatchReelLike({ type: 'toggle', reelId: r.id })}
                      title={`Me gusta (${reelLikes.counts[r.id] ?? 0})`}
                      aria-pressed={reelLikes.liked[r.id]}
                    >
                      <ThumbsUp />
                    </button>
                    <span className="min-w-[1.25rem] text-center text-[11px] font-extrabold leading-none text-white/90">
                      {reelLikes.counts[r.id] ?? 0}
                    </span>
                  </div>

                  <button type="button" className={reelBtn} onClick={() => setCommentsOpen(true)}>
                    <MessageCircle />
                  </button>
                  <button type="button" className={reelBtn} onClick={() => setShareOpen(true)}>
                    <Send />
                  </button>
                  <button
                    type="button"
                    className={cn(reelBtn, savedReels[r.id] && 'border-white/35 bg-[rgba(37,99,235,0.55)]')}
                    onClick={() => {
                      toggleSavedReel(r.id)
                      toast(savedReels[r.id] ? 'Quitado de guardados' : 'Guardado', { icon: '🔖' })
                    }}
                  >
                    <Bookmark />
                  </button>

                  {canPublish && (
                    <button
                      type="button"
                      className={cn(reelBtn, 'bg-[rgba(34,197,94,0.35)]')}
                      onClick={() => {
                        const highTrust = me.trustScore >= 50
                        if (highTrust) toast.success('Publicación creada')
                        else toast('Revisión preventiva: el video quedará pendiente', { icon: '⚠️' })
                      }}
                    >
                      <Upload />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-[240px] items-center justify-center bg-[var(--surface)] px-6 text-center">
            <div>
              <p className="text-lg font-semibold text-[var(--text)]">Aún no hay reels</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Cuando haya contenido, podrás verlo aquí.</p>
            </div>
          </div>
        )}
      </div>

      <ReelCommentsPanel
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        reel={currentReel ? { id: currentReel.id, title: currentReel.title, by: currentReel.by } : null}
        comments={currentReel ? commentsByReel[currentReel.id] ?? [] : []}
        onAddComment={addComment}
        onSetRating={setCommentRating}
        viewerId={me.id}
      />

      {shareOpen && (
        <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="vt-modal">
            <div className="vt-modal-title">Compartir</div>
            <div className="vt-modal-body">
              Lista de contactos registrados:
              <div className="mt-3 flex flex-wrap gap-2.5">
                {['María', 'Carlos', 'Lucía', 'Pedro'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="vt-btn"
                    onClick={() => {
                      toast.success(`Compartido con ${c}`)
                      setShareOpen(false)
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="vt-modal-actions">
              <button type="button" className="vt-btn" onClick={() => setShareOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
