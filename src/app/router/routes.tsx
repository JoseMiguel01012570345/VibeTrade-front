import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "@app/shell/AppShell";
import { SessionGate } from "@app/layouts/SessionGate";
import { ChatListPage, ChatPage, RoutePreselInvitePage } from "@features/chat";
import { HomePage } from "@features/home";
import { NotificationsPage } from "@features/notifications";
import {
  OfferPage,
  OfferRouteMapPage,
  StoreLocationMapPage,
  StorePage,
} from "@features/market";
import { ProfileComposerPage } from "@features/profile";
import { ReelsPage } from "@features/reels";
import {
  ConfirmPasswordResetPage,
  ForgotPasswordPage,
  LoginPage,
  OnboardingWelcomePage,
  RegisterPage,
  RegisterVerifyEmailPage,
  RegisterVerifyPhonePage,
} from "@features/auth";
import { CatalogSearchPage } from "@features/catalog";
import {
  CartPage,
  CheckoutPage,
  OrderReceiptPage,
  OrderTrackingPage,
  PurchaseHistoryPage,
} from "@features/orders";
import {
  AffiliateDashboardPage,
  DebtsAdminPage,
  WarehousePortalPage,
} from "@features/finance";
import { MensualidadPage } from "@features/trust";
import { UsersAdminPage } from "@features/users";
import { StatisticsPage } from "@features/statistics";

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
          <Route path="/stores" element={<Navigate to="/search" replace />} />
          <Route path="/offer/:offerId/mapa" element={<OfferRouteMapPage />} />
          <Route path="/offer/:offerId" element={<OfferPage />} />
          <Route path="/store/:storeId/mapa" element={<StoreLocationMapPage />} />
          <Route path="/store/:storeId" element={<StorePage />} />
          <Route path="/store/:storeId/vitrina" element={<StorePage />} />
          <Route path="/store/:storeId/products" element={<StorePage />} />
          <Route path="/store/:storeId/services" element={<StorePage />} />

          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pedido/:publicNumber" element={<OrderReceiptPage />} />
          <Route path="/rastreo/:publicNumber" element={<OrderTrackingPage />} />
          <Route path="/mis-compras" element={<PurchaseHistoryPage />} />

          <Route path="/finanzas/deudas" element={<DebtsAdminPage />} />
          <Route path="/afiliado" element={<AffiliateDashboardPage />} />
          <Route path="/almacen/:storeId/pedidos" element={<WarehousePortalPage />} />
          <Route path="/mensualidad" element={<MensualidadPage />} />
          <Route path="/admin/usuarios" element={<UsersAdminPage />} />
          <Route path="/estadisticas" element={<StatisticsPage />} />

          <Route path="/chat" element={<ChatListPage />} />
          <Route
            path="/invite/presel/:threadId"
            element={<RoutePreselInvitePage />}
          />
          <Route path="/chat/:threadId" element={<ChatPage />} />
          <Route path="/reels" element={<ReelsPage />} />

          <Route path="/profile/:userId" element={<ProfileDefaultRedirect />} />
          <Route path="/profile/:userId/:section" element={<ProfileComposerPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
