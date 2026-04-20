/**
 * Domain types for offer public Q&A (jsonb `OfferQaJson` on the server).
 * Keep in sync with `VibeTrade-back/Domain/Market/OfferQa*.cs`.
 */

/** Persisted author snapshot in jsonb — mirrors C# `OfferQaAuthorSnapshot`. */
export type OfferQaAuthorSnapshot = {
  id: string;
  name: string;
  trustScore: number;
};

/** One row in the persisted QA array — mirrors C# `OfferQaComment`. */
export type OfferQaComment = {
  id: string;
  text: string;
  question?: string;
  parentId?: string | null;
  askedBy?: OfferQaAuthorSnapshot;
  author?: OfferQaAuthorSnapshot;
  /** Unix ms */
  createdAt: number;
  answer?: string;
};

/** Optional fields added by GET `/market/offers/{id}/qa` (not stored in jsonb). */
export type OfferQaCommentApiFields = {
  likeCount?: number;
  viewerLiked?: boolean;
};

export type OfferQaCommentEnriched = OfferQaComment & OfferQaCommentApiFields;
