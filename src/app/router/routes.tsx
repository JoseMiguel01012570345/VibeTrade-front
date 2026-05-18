import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "@app/shell/AppShell";
import { SessionGate } from "@app/layouts/SessionGate";
import { ChatListPage } from "@features/chat/ChatListPage";
import { ChatPage } from "@features/chat/ChatPage";
import { RoutePreselInvitePage } from "@features/chat/RoutePreselInvitePage";
import { HomePage } from "@features/home/HomePage";
import { NotificationsPage } from "@features/notifications/NotificationsPage";
import { OfferPage } from "@features/market/pages/OfferPage";
import { OfferRouteMapPage } from "@features/market/pages/OfferRouteMapPage";
import { ProfilePage } from "@features/profile/ProfilePage";
import { ReelsPage } from "@features/reels/ReelsPage";
import { StoreLocationMapPage } from "@features/market/pages/StoreLocationMapPage";
import { StorePage } from "@features/market/pages/StorePage";
import { OtpPage } from "@features/auth/pages/OtpPage";
import { OnboardingWelcomePage } from "@features/auth/pages/OnboardingWelcomePage";
import { PhoneEntryPage } from "@features/auth/pages/PhoneEntryPage";
import { CatalogSearchPage } from "@features/catalog/pages/CatalogSearchPage";
import { StoresSearchPage } from "@features/catalog/pages/StoresSearchPage";

function RootRedirect() {
  return <Navigate to="/home" replace />;
}

/** `/profile/:userId` → `/profile/:userId/account` */
function ProfileDefaultRedirect() {
  const { userId } = useParams();
  if (!userId) return <Navigate to="/home" replace />;
  return <Navigate to={`/profile/${userId}/account`} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route element={<SessionGate />}>
          <Route path="/" element={<RootRedirect />} />

          <Route path="/onboarding" element={<OnboardingWelcomePage />} />
          <Route path="/onboarding/phone" element={<PhoneEntryPage />} />
          <Route path="/onboarding/otp" element={<OtpPage />} />

          <Route path="/home" element={<HomePage />} />
          <Route path="/search" element={<CatalogSearchPage />} />
          <Route path="/stores" element={<StoresSearchPage />} />
          <Route path="/offer/:offerId/mapa" element={<OfferRouteMapPage />} />
          <Route path="/offer/:offerId" element={<OfferPage />} />
          <Route path="/store/:storeId/mapa" element={<StoreLocationMapPage />} />
          <Route path="/store/:storeId" element={<StorePage />} />
          <Route path="/store/:storeId/vitrina" element={<StorePage />} />
          <Route path="/store/:storeId/products" element={<StorePage />} />
          <Route path="/store/:storeId/services" element={<StorePage />} />

          <Route path="/chat" element={<ChatListPage />} />
          <Route
            path="/invite/presel/:threadId"
            element={<RoutePreselInvitePage />}
          />
          <Route path="/chat/:threadId" element={<ChatPage />} />
          <Route path="/reels" element={<ReelsPage />} />

          <Route path="/profile/:userId" element={<ProfileDefaultRedirect />} />
          <Route path="/profile/:userId/:section" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
