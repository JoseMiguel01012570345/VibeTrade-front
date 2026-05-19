import { vi } from "vitest";
import { useAppStore, type User } from "@app/store/useAppStore";
import { useMarketStore } from "@app/store/useMarketStore";
import type {
  RecommendationHomeBulk,
  Offer,
} from "@app/store/marketStoreTypes";
import type { StoreCatalog } from "@features/market/model/storeCatalogTypes";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";

const guestMe: User = {
  id: "guest",
  name: "",
  email: "",
  phone: "",
  trustScore: 0,
};

export function resetAppStore() {
  useAppStore.setState({
    isSessionActive: false,
    me: { ...guestMe },
    profileDisplayNames: {},
    profileAvatarUrls: {},
    profileTrustScores: {},
    userTrustLedger: {},
    storeTrustLedger: {},
    profileSocialLinks: {},
    trustThreshold: 0,
    lastThresholdState: "above",
    notifications: [],
    savedReels: {},
    savedOffers: {},
    authModalOpen: false,
    homeFeedScrollY: null,
  });
}

export function resetMarketStore() {
  useMarketStore.setState({
    stores: {},
    offers: {},
    offerIds: [],
    threads: {},
    routeOfferPublic: {},
    storeCatalogs: {},
    recommendationHomeBulks: [],
    recommendationBagStartBulkIdx: 0,
    recommendationFeedExhausted: false,
    recommendationCachedOfferIds: [],
    recommendationCachedStoreIds: [],
    recommendationStoreStripAnchors: [],
  });
}

type SeedAppOptions = {
  me?: User;
  isSessionActive?: boolean;
  profileSocialLinks?: Record<string, string | undefined>;
  profileDisplayNames?: Record<string, string>;
  savedOffers?: Record<string, boolean>;
};

export function seedAppStore(opts: SeedAppOptions = {}) {
  const me = opts.me ?? guestMe;
  useAppStore.setState({
    isSessionActive: opts.isSessionActive ?? me.id !== "guest",
    me,
    profileSocialLinks: opts.profileSocialLinks ?? {},
    profileDisplayNames: opts.profileDisplayNames ?? {},
    savedOffers: opts.savedOffers ?? {},
  });
}

type SeedMarketOptions = {
  stores?: ReturnType<typeof useMarketStore.getState>["stores"];
  storeCatalogs?: Record<string, StoreCatalog>;
  offers?: ReturnType<typeof useMarketStore.getState>["offers"];
  offerIds?: string[];
};

export function seedMarketStore(opts: SeedMarketOptions = {}) {
  useMarketStore.setState({
    stores: opts.stores ?? {},
    storeCatalogs: opts.storeCatalogs ?? {},
    offers: opts.offers ?? {},
    offerIds: opts.offerIds ?? [],
  });
}

type SeedRecommendationFeedOptions = {
  bulks: RecommendationHomeBulk[];
  bagStartBulkIdx?: number;
  offers?: Record<string, Offer>;
  stores?: ReturnType<typeof useMarketStore.getState>["stores"];
};

export function seedRecommendationFeed(opts: SeedRecommendationFeedOptions) {
  const flatIds = opts.bulks.flatMap((b) => b.offerIds);
  useMarketStore.setState({
    recommendationHomeBulks: opts.bulks,
    recommendationBagStartBulkIdx: opts.bagStartBulkIdx ?? 0,
    offerIds: flatIds,
    offers: opts.offers ?? useMarketStore.getState().offers,
    stores: opts.stores ?? useMarketStore.getState().stores,
    recommendationCachedOfferIds: [...flatIds],
    recommendationFeedExhausted: false,
  });
}

export function mockRefreshOfferQaFromServer() {
  const fn = vi.fn().mockResolvedValue(undefined);
  useMarketStore.setState({ refreshOfferQaFromServer: fn });
  return fn;
}

export function seedStoreWithCatalog(
  storeId: string,
  catalog: StoreCatalog,
  storeOverrides: Partial<
    ReturnType<typeof useMarketStore.getState>["stores"][string]
  > = {},
) {
  const stores = useMarketStore.getState().stores;
  const existing = stores[storeId];
  seedMarketStore({
    stores: {
      ...stores,
      [storeId]: makeStoreBadge({
        ownerUserId: existing?.ownerUserId ?? "user-test-1",
        ...existing,
        ...storeOverrides,
        id: storeId,
      }),
    },
    storeCatalogs: {
      ...useMarketStore.getState().storeCatalogs,
      [storeId]: catalog,
    },
  });
}
