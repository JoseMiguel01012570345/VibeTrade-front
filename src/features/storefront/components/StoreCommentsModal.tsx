import { useId, useRef, type ReactNode } from "react";
import { Heart, MessagesSquare, Send, X } from "lucide-react";
import { CeFlowbiteModal } from "@shared/components/ui";
import { cn } from "@shared/lib/cn";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import type { OfferCommentNorm } from "@features/market/Dtos/offerCommentsTypes";
import { resolveOfferCommentAuthorLabel } from "@features/market/logic/offerComments";
import { timeAgo } from "@features/market/logic/relativeTime";
import {
  STOREFRONT_COMMENTS_MODAL_THEME,
  STOREFRONT_MODAL_BACKDROP,
} from "../lib/storefrontModalTheme";
import {
  useStorefrontAmbient,
  storefrontAmbientPortalProps,
} from "../context/StorefrontAmbientContext";
import { useStoreComments } from "../logic/useStoreComments";

/**
 * Modal «Comentarios públicos» de la tienda. Tablero tipo Q&A a nivel de tienda: cualquier
 * cliente autenticado publica una consulta u opinión y el dueño responde en el hilo (mismo
 * modelo que el Q&A por-oferta, con identidad, confianza y me gusta). Se abre desde el enlace
 * «FAQ» del pie de página. Estética moderna de la tienda (emerald/crema), en portal con
 * bloqueo de scroll y cierre con Escape, coherente con el resto de modales del storefront.
 */
export function StoreCommentsModal({
  open,
  store,
  onClose,
}: Readonly<{
  open: boolean;
  store: StoreBadge;
  onClose: () => void;
}>) {
  const c = useStoreComments(store, open);
  const ambient = useStorefrontAmbient();
  const portalAmbient = storefrontAmbientPortalProps(ambient);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();

  function renderThread(parentId: string | null, depth: number) {
    const rows = c.tree.get(parentId) ?? [];
    return rows.map((comment) => {
      const childRows = c.tree.get(comment.id) ?? [];
      const isStoreAuthor =
        !!store.ownerUserId && comment.author.id === store.ownerUserId;
      const authorLabel = resolveOfferCommentAuthorLabel(
        comment.author,
        c.nameCtx,
      );
      const trustScore =
        comment.author.id === c.me.id ? c.me.trustScore : comment.author.trustScore;
      return (
        <div key={comment.id} className="min-w-0">
          <div className={cn("flex gap-2.5 py-2.5", depth > 0 && "pt-1.5")}>
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black uppercase",
                isStoreAuthor
                  ? "vt-storefront-modal-avatar--store"
                  : "vt-storefront-modal-avatar--guest ring-1",
              )}
              aria-hidden
            >
              {authorLabel.trim().charAt(0) || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-extrabold text-slate-900">
                  {authorLabel}
                </span>
                {isStoreAuthor ? (
                  <span className="vt-storefront-modal-chip rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
                    Tienda
                  </span>
                ) : null}
                <span
                  className="vt-storefront-modal-chip rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                  title="Indicador de confianza del autor."
                >
                  Confianza {trustScore}
                </span>
                <span className="text-[11px] text-slate-400">
                  {timeAgo(comment.createdAt)}
                </span>
              </div>
              <p className="mt-1 break-words text-sm leading-snug text-slate-700 [overflow-wrap:break-word]">
                {comment.text}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <LikeButton
                  comment={comment}
                  canEngage={c.canEngageLikes}
                  onToggle={() => void c.toggleLike(comment)}
                />
                {c.sessionReady && !c.isGuest ? (
                  <button
                    type="button"
                    className="vt-storefront-accent-text text-xs font-extrabold transition hover:underline"
                    onClick={() => {
                      c.setReplyingTo(comment);
                      inputRef.current?.focus();
                    }}
                  >
                    Responder
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          {childRows.length > 0 ? (
            <div
              className="mb-1 ml-3.5 border-l-2 border-[color-mix(in_oklab,rgb(var(--storefront-border-rgb))_65%,var(--border))] pl-3"
              role="group"
              aria-label="Respuestas en este hilo"
            >
              {renderThread(comment.id, depth + 1)}
            </div>
          ) : null}
        </div>
      );
    });
  }

  const rootCount = (c.tree.get(null) ?? []).length;

  let composerPlaceholder = "Escribe un comentario…";
  if (!c.sessionReady || c.isGuest)
    composerPlaceholder = "Inicia sesión para comentar…";
  else if (c.composerLocked) composerPlaceholder = "Elige «Responder»…";
  else if (c.replyingTo) composerPlaceholder = "Escribe una respuesta…";

  function renderListBody(): ReactNode {
    if (c.loading && c.comments.length === 0) {
      return (
        <p className="py-10 text-center text-sm text-slate-400">
          Cargando comentarios…
        </p>
      );
    }
    if (c.error) {
      return (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-500">
            No se pudieron cargar los comentarios.
          </p>
          <button
            type="button"
            onClick={() => void c.reload()}
            className="vt-storefront-control mt-3 rounded-full border px-4 py-1.5 text-sm font-semibold transition"
          >
            Reintentar
          </button>
        </div>
      );
    }
    if (rootCount === 0) {
      return (
        <div className="py-12 text-center">
          <span className="vt-storefront-modal-icon mx-auto grid h-12 w-12 place-items-center rounded-2xl">
            <MessagesSquare size={22} aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Aún no hay comentarios.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Sé el primero en dejar una pregunta o una opinión.
          </p>
        </div>
      );
    }
    return (
      <div className="divide-y divide-[#f0ebe6]">{renderThread(null, 0)}</div>
    );
  }

  let composerHint: ReactNode = null;
  if (!c.sessionReady || c.isGuest) {
    composerHint = (
      <p className="mb-2 text-xs text-slate-500">
        <strong className="text-slate-700">Inicia sesión</strong> para comentar
        y dar me gusta en esta tienda.
      </p>
    );
  } else if (c.composerLocked) {
    composerHint = (
      <p className="mb-2 text-xs text-slate-500">
        Como dueño de la tienda, usa{" "}
        <strong className="text-slate-700">Responder</strong> en un comentario
        para publicar aquí.
      </p>
    );
  }

  return (
    <CeFlowbiteModal
      show={open}
      onClose={onClose}
      dismissible={!c.sending}
      mobileSheet
      size="xl"
      theme={STOREFRONT_COMMENTS_MODAL_THEME}
      backdropClassName={STOREFRONT_MODAL_BACKDROP}
      panelClassName={cn("vt-storefront-modal store-front-surface", portalAmbient.className)}
      panelStyle={portalAmbient.style}
    >
      <div className="relative shrink-0 px-6 pb-3 pt-5 sm:pt-6">
        <div className="mb-3 flex justify-center sm:hidden" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-start gap-3 pr-8">
          <span className="vt-storefront-modal-icon grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
            <MessagesSquare size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-xl font-extrabold tracking-tight text-slate-900"
            >
              Comentarios públicos
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Preguntas y opiniones sobre {store.name}. El equipo de la tienda
              responde por aquí.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={c.sending}
          aria-label="Cerrar"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div
        ref={listRef}
        className="min-h-0 overflow-y-auto overscroll-y-contain border-y border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_42%,var(--surface))] px-6 py-2"
      >
        {renderListBody()}
      </div>

      <div className="shrink-0 bg-[color-mix(in_oklab,var(--bg)_38%,var(--surface))] px-6 py-3.5">
        {c.replyingTo ? (
          <div className="vt-storefront-modal-reply-banner mb-2.5 flex items-start justify-between gap-2 rounded-xl border px-3 py-2">
            <div className="min-w-0">
              <span className="vt-storefront-accent-text block text-xs font-extrabold">
                Respondiendo a{" "}
                {resolveOfferCommentAuthorLabel(c.replyingTo.author, c.nameCtx)}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">
                {c.replyingTo.text}
              </span>
            </div>
            <button
              type="button"
              aria-label="Cancelar respuesta"
              onClick={() => c.setReplyingTo(null)}
              className="shrink-0 rounded-lg p-0.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ) : null}
        {composerHint}
        <div className="flex items-stretch gap-2.5">
          <input
            ref={inputRef}
            className="vt-storefront-input min-w-0 flex-1 rounded-full border px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-stone-100"
            disabled={c.sending || c.composerLocked}
            placeholder={composerPlaceholder}
            value={c.draft}
            onChange={(e) => c.setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void c.submit();
              }
            }}
          />
          <button
            type="button"
            aria-label="Enviar comentario"
            title="Enviar"
            disabled={c.sending || c.composerLocked || !c.draft.trim()}
            onClick={() => void c.submit()}
            className="vt-storefront-accent-btn grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </CeFlowbiteModal>
  );
}

function LikeButton({
  comment,
  canEngage,
  onToggle,
}: Readonly<{
  comment: OfferCommentNorm;
  canEngage: boolean;
  onToggle: () => void;
}>) {
  const count = comment.likeCount ?? 0;
  const liked = comment.viewerLiked === true;
  if (!canEngage) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-400"
        title="Inicia sesión para dar me gusta"
      >
        <Heart size={14} aria-hidden />
        <span className="tabular-nums">{count}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      title={liked ? "Quitar me gusta" : "Me gusta"}
      className="vt-storefront-control inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-extrabold text-slate-500 transition"
    >
      <Heart
        size={14}
        aria-hidden
        className={cn(liked && "fill-rose-500 text-rose-500")}
      />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
