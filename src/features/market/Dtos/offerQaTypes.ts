/**
 * Shared shapes for public comment threads: store-level comments (`CommentsJson`) and
 * emergent-offer Q&A (`OfferQaJson`) on the server. Keep in sync with the backend `OfferQa*` records.
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

/** Optional fields added by the comments list endpoint (likes; not stored in jsonb). */
export type OfferQaCommentApiFields = {
  likeCount?: number;
  viewerLiked?: boolean;
};

export type OfferQaCommentEnriched = OfferQaComment & OfferQaCommentApiFields;
