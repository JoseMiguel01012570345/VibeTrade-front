import { useCallback, useEffect, useMemo, useState } from "react";
import { toastApiError, openAuthModalForApiError } from "@features/auth/logic/toastApiError";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { getSessionToken } from "@shared/services/http/sessionToken";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import type {
  OfferQaCommentEnriched,
} from "@features/market/Dtos/offerQaTypes";
import type { OfferCommentNorm } from "@features/market/Dtos/offerCommentsTypes";
import {
  fetchStoreComments,
  postStoreComment,
  toggleStoreCommentLike,
} from "@features/market/api/storeCommentsApi";

/** Mapea un ítem del API a comentario normalizado; `null` si le falta id, texto o autor. */
function mapStoreComment(item: OfferQaCommentEnriched): OfferCommentNorm | null {
  const id = item.id;
  const text = (item.text || item.question || "").trim();
  const a = item.author ?? item.askedBy;
  if (!id || !text || !a?.id) return null;

  const parentId =
    typeof item.parentId === "string" && item.parentId.length > 0
      ? item.parentId
      : null;
  const createdAt =
    typeof item.createdAt === "number" && Number.isFinite(item.createdAt)
      ? item.createdAt
      : Date.now();

  return {
    id,
    parentId,
    text,
    author: {
      id: a.id,
      name: a.name ?? "",
      trustScore: typeof a.trustScore === "number" ? a.trustScore : 0,
    },
    createdAt,
    likeCount: typeof item.likeCount === "number" ? item.likeCount : 0,
    viewerLiked: item.viewerLiked === true,
  };
}

/**
 * Aplana la respuesta del API (comentarios de tienda enriquecidos) a la lista normalizada que
 * usan los hilos de comentarios, ordenada por antigüedad. Solo shape nuevo (`text`/`parentId`).
 */
function normalizeStoreComments(
  list: OfferQaCommentEnriched[],
): OfferCommentNorm[] {
  const out: OfferCommentNorm[] = [];
  for (const item of list) {
    const mapped = mapStoreComment(item);
    if (mapped) out.push(mapped);
  }
  return out.sort((x, y) => x.createdAt - y.createdAt);
}

/**
 * Estado y acciones del tablero de «Comentarios públicos» de una tienda. Refleja el hilo
 * por-oferta (identidad, confianza, likes, respuestas del dueño) pero contra los endpoints
 * de tienda. La carga ocurre solo cuando el modal está abierto.
 */
export function useStoreComments(store: StoreBadge, open: boolean) {
  const me = useAppStore((s) => s.me);
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames);

  const [comments, setComments] = useState<OfferCommentNorm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<OfferCommentNorm | null>(null);
  const [sending, setSending] = useState(false);

  const sessionReady = isSessionActive || !!getSessionToken();
  const isGuest = me.id === "guest";
  const isOwner = !!store.ownerUserId && me.id === store.ownerUserId;
  const canEngageLikes = !isGuest && sessionReady;
  const composerLocked =
    !sessionReady || isGuest || (isOwner && !replyingTo);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await fetchStoreComments(store.id);
      setComments(normalizeStoreComments(list ?? []));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [store.id]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  useEffect(() => {
    if (!open) {
      setDraft("");
      setReplyingTo(null);
    }
  }, [open]);

  const tree = useMemo(() => {
    const byParent = new Map<string | null, OfferCommentNorm[]>();
    for (const c of comments) {
      const k = c.parentId;
      const arr = byParent.get(k);
      if (arr) arr.push(c);
      else byParent.set(k, [c]);
    }
    for (const arr of byParent.values())
      arr.sort((a, b) => a.createdAt - b.createdAt);
    return byParent;
  }, [comments]);

  const nameCtx = useMemo(
    () => ({ viewerId: me.id, viewerName: me.name, profileDisplayNames }),
    [me.id, me.name, profileDisplayNames],
  );

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text || composerLocked) return;
    setSending(true);
    try {
      await postStoreComment(store.id, {
        text,
        parentId: replyingTo?.id ?? null,
      });
      setDraft("");
      setReplyingTo(null);
      await reload();
    } catch (e) {
      toastApiError(e, "No se pudo enviar. Prueba de nuevo.");
    } finally {
      setSending(false);
    }
  }, [draft, composerLocked, store.id, replyingTo, reload]);

  const toggleLike = useCallback(
    async (comment: OfferCommentNorm) => {
      if (!canEngageLikes) return;
      const liked = comment.viewerLiked === true;
      const nextLiked = !liked;
      const delta = nextLiked ? 1 : -1;
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? {
                ...c,
                viewerLiked: nextLiked,
                likeCount: Math.max(0, (c.likeCount ?? 0) + delta),
              }
            : c,
        ),
      );
      try {
        const res = await toggleStoreCommentLike(store.id, comment.id);
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.id
              ? { ...c, viewerLiked: res.liked, likeCount: res.likeCount }
              : c,
          ),
        );
      } catch (e) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.id
              ? { ...c, viewerLiked: liked, likeCount: comment.likeCount ?? 0 }
              : c,
          ),
        );
        if (openAuthModalForApiError(e)) return;
        toastApiError(e, "No se pudo actualizar el me gusta.");
      }
    },
    [canEngageLikes, store.id],
  );

  return {
    me,
    nameCtx,
    comments,
    tree,
    loading,
    error,
    reload,
    draft,
    setDraft,
    replyingTo,
    setReplyingTo,
    sending,
    submit,
    toggleLike,
    sessionReady,
    isGuest,
    isOwner,
    canEngageLikes,
    composerLocked,
  };
}
