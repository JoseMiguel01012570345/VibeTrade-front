import { useAppStore, type User } from "@app/store/useAppStore";
import { useMarketStore } from "@app/store/useMarketStore";

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
  });
}

type SeedAppOptions = {
  me?: User;
  isSessionActive?: boolean;
  profileSocialLinks?: Record<string, string | undefined>;
  profileDisplayNames?: Record<string, string>;
};

export function seedAppStore(opts: SeedAppOptions = {}) {
  const me = opts.me ?? guestMe;
  useAppStore.setState({
    isSessionActive: opts.isSessionActive ?? me.id !== "guest",
    me,
    profileSocialLinks: opts.profileSocialLinks ?? {},
    profileDisplayNames: opts.profileDisplayNames ?? {},
  });
}

type SeedMarketOptions = {
  stores?: ReturnType<typeof useMarketStore.getState>["stores"];
};

export function seedMarketStore(opts: SeedMarketOptions = {}) {
  useMarketStore.setState({
    stores: opts.stores ?? {},
  });
}
