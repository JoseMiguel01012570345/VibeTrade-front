import { e2eApiUrl } from "./e2e-api-base";

export async function fetchE2EOfferCard(offerId: string): Promise<{
  storeName: string;
  offerTitle: string;
}> {
  const res = await fetch(
    e2eApiUrl(`/api/v1/market/offers/${encodeURIComponent(offerId)}/card`),
  );
  if (!res.ok) {
    throw new Error(`offer card HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    store?: { name?: string };
    offer?: { title?: string };
  };
  return {
    storeName: (json.store?.name ?? "").trim(),
    offerTitle: (json.offer?.title ?? "").trim(),
  };
}

export async function fetchE2EPublicUserName(userId: string): Promise<string> {
  const res = await fetch(
    e2eApiUrl(`/api/v1/auth/public-profile/${encodeURIComponent(userId)}`),
  );
  if (!res.ok) {
    throw new Error(`public profile HTTP ${res.status}`);
  }
  const json = (await res.json()) as { name?: string };
  return (json.name ?? "").trim() || "Comprador";
}

export function expectedBuyerChatTitle(
  storeName: string,
  offerTitle: string,
): string {
  return `${storeName} · ${offerTitle}`;
}

export function expectedSellerChatTitle(
  buyerName: string,
  offerTitle: string,
): string {
  return `${buyerName} · ${offerTitle}`;
}
