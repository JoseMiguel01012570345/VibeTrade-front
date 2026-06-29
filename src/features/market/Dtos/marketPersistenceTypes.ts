import type { Offer, StoreBadge } from "./marketTypes";

export type PostOfferInquiryBody = {
  offerId: string;
  /** Legado; el servidor acepta también `text`. */
  question: string;
  text?: string;
  parentId?: string | null;
  askedBy: { id: string; name: string; trustScore: number };
  createdAt?: number;
};

export type PostOfferInquiryResponse = {
  id: string;
  question: string;
  text?: string;
  parentId?: string | null;
  askedBy: { id: string; name: string; trustScore: number };
  author?: { id: string; name: string; trustScore: number };
  createdAt: number;
};

export type PublicOfferCardResponse = { offer: Offer; store: StoreBadge };
