import type { OfferCommentNorm } from "@features/market/pages/offerComments";

export function makeOfferComment(
  overrides: Partial<OfferCommentNorm> = {},
): OfferCommentNorm {
  return {
    id: "cmt-1",
    parentId: null,
    text: "¿Tienen envío?",
    author: { id: "buyer-1", name: "Comprador", trustScore: 50 },
    createdAt: Date.now() - 60_000,
    likeCount: 0,
    viewerLiked: false,
    ...overrides,
  };
}
