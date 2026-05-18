import { useAppStore, type User } from "@app/store/useAppStore";
import { useMarketStore } from "@app/store/useMarketStore";
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
    routeOfferPublic: {},
    storeCatalogs: {},
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
