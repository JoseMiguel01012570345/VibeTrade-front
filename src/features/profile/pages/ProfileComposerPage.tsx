import { useEffect, useMemo } from "react";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { ProfileStoresSection } from "../components/ProfileStoresSection";
import { reelTitlesById } from "@features/reels/api/reelsBootstrapState";
import { useProfileVisitor } from "../hooks/useProfileVisitor";
import { useProfileSavedOffers } from "../hooks/useProfileSavedOffers";
import {
  isProfileSection,
  profileSectionPath,
  type ProfileSection,
} from "@features/profile/logic/profilePaths";
import {
  resolveIsMe,
  resolveProfileUserId,
  shouldRedirectProfileTab,
} from "../logic/profileAccountLogic";
import { ProfileAccountPage } from "./ProfileAccountPage";
import { ProfileSavedPage } from "./ProfileSavedPage";
import { ProfileReelsPage } from "./ProfileReelsPage";
import { ProfilePageHeader } from "../components/ProfilePageHeader";
import { ProfileSidebar } from "../components/ProfileSidebar";
import "../styles/profile.css";

export function ProfileComposerPage() {
  const { userId, section: sectionParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);
  const stores = useMarketStore((s) => s.stores);
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames);
  const profileAvatarUrls = useAppStore((s) => s.profileAvatarUrls);
  const saved = useAppStore((s) => s.savedReels);
  const routeOfferPublic = useMarketStore((s) => s.routeOfferPublic);

  const isMe = resolveIsMe(userId, me.id);
  const resolvedProfileUserId = resolveProfileUserId(userId, me.id, isMe);

  const safeName = me.name ?? "";
  const safeEmail = me.email ?? "";
  const safeUsername = me.username ?? "";

  const storesForProfile = useMemo(() => {
    return Object.values(stores).filter(
      (b) => b.ownerUserId === resolvedProfileUserId,
    );
  }, [stores, resolvedProfileUserId]);

  const reelTitles = useMemo(() => reelTitlesById(), []);

  const { visitorPublic, visitorPublicStatus } = useProfileVisitor(
    resolvedProfileUserId,
    isMe,
  );

  const profileDisplayName = isMe
    ? safeName
    : visitorPublic?.name?.trim() ||
      profileDisplayNames[resolvedProfileUserId]?.trim() ||
      `Usuario ${resolvedProfileUserId}`;

  const tab: ProfileSection =
    sectionParam && isProfileSection(sectionParam) ? sectionParam : "account";

  useEffect(() => {
    if (!userId) return;
    const redirect = shouldRedirectProfileTab(tab, isMe, storesForProfile.length);
    if (redirect) {
      nav(profileSectionPath(userId, redirect), { replace: true });
    }
  }, [tab, storesForProfile.length, isMe, userId, nav]);

  const { savedOfferItems } = useProfileSavedOffers(tab === "saved" && isMe);

  const savedIds = useMemo(
    () => Object.keys(saved).filter((id) => saved[id]),
    [saved],
  );

  const visitorAvatarDisplay =
    visitorPublic?.avatarUrl || profileAvatarUrls[resolvedProfileUserId];

  const letter =
    (isMe
      ? safeName
      : visitorPublic?.name ||
        profileDisplayNames[resolvedProfileUserId] ||
        userId ||
        "U"
    )
      .slice(0, 1)
      .toUpperCase() || "?";

  if (!userId) {
    return <Navigate to="/home" replace />;
  }

  if (sectionParam && !isProfileSection(sectionParam)) {
    return <Navigate to={profileSectionPath(userId, "account")} replace />;
  }

  return (
    <div className="vt-profile-page">
      <div className="mx-auto w-full max-w-[1140px] px-4 py-4 sm:py-6">
        <ProfilePageHeader
          title={isMe ? "Perfil" : `Perfil · ${profileDisplayName}`}
          onBack={() => nav(-1)}
        />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <ProfileSidebar
            userId={userId}
            tab={tab}
            isMe={isMe}
            showStoresTab={isMe || storesForProfile.length > 0}
          />

          <div className="min-w-0 flex-1">
            {tab === "account" ? (
              <ProfileAccountPage
                isMe={isMe}
                safeName={safeName}
                safeEmail={safeEmail}
                safeUsername={safeUsername}
                profileDisplayName={profileDisplayName}
                letter={letter}
                visitorPublic={visitorPublic}
                visitorPublicStatus={visitorPublicStatus}
                visitorAvatarDisplay={visitorAvatarDisplay}
                searchParams={searchParams}
                setSearchParams={setSearchParams}
              />
            ) : null}

            {tab === "stores" && (isMe || storesForProfile.length > 0) ? (
              <ProfileStoresSection
                ownerUserId={resolvedProfileUserId}
                canEdit={isMe}
              />
            ) : null}

            {tab === "saved" && isMe ? (
              <ProfileSavedPage
                savedOfferItems={savedOfferItems}
                stores={stores}
                routeOfferPublic={routeOfferPublic}
              />
            ) : null}

            {tab === "reels" && isMe ? (
              <ProfileReelsPage savedIds={savedIds} reelTitles={reelTitles} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
