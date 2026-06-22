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
import { OnboardingWelcomePage } from "@features/auth/pages/OnboardingWelcomePage";
import { LoginPage } from "@features/auth/pages/LoginPage";
import { RegisterPage } from "@features/auth/pages/RegisterPage";
import { RegisterVerifyPhonePage } from "@features/auth/pages/RegisterVerifyPhonePage";
import { RegisterVerifyEmailPage } from "@features/auth/pages/RegisterVerifyEmailPage";
import { ForgotPasswordPage } from "@features/auth/pages/ForgotPasswordPage";
import { ConfirmPasswordResetPage } from "@features/auth/pages/ConfirmPasswordResetPage";
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
          <Route path="/onboarding/login" element={<LoginPage />} />
          <Route path="/onboarding/register" element={<RegisterPage />} />
          <Route path="/onboarding/verify-phone" element={<RegisterVerifyPhonePage />} />
          <Route path="/onboarding/verify-email" element={<RegisterVerifyEmailPage />} />
          <Route path="/onboarding/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/onboarding/confirm-password-reset" element={<ConfirmPasswordResetPage />} />
          <Route path="/onboarding/phone" element={<Navigate to="/onboarding/register" replace />} />
          <Route path="/onboarding/otp" element={<Navigate to="/onboarding" replace />} />

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
