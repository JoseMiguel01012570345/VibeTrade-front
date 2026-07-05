import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "@app/shell/AppShell";
import { SessionGate } from "@app/layouts/SessionGate";
import { storePathFromName } from "@features/market/logic/store/storePath";
import { ChatLayout, ChatPage, RoutePreselInvitePage } from "@features/chat";
import { HomePage } from "@features/home";
import { NotificationsPage } from "@features/notifications";
import {
  OfferPage,
  OfferRouteMapPage,
  StoreLegacyRedirect,
  StoreLocationMapPage,
} from "@features/market";
import {
  StorefrontCategoryPage,
  StorefrontPage,
  StorefrontTrackingPage,
} from "@features/storefront";
import { OwnerStoreDashboard, StaffLoginPage } from "@features/store-admin";
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
  LegacyStoreCartRedirect,
  LegacyStoreCheckoutRedirect,
  OrderReceiptPage,
  PurchaseHistoryPage,
  TrackShipmentPage,
} from "@features/orders";
import {
  AffiliateDashboardPage,
  DebtsAdminPage,
  WarehousePortalPage,
} from "@features/finance";
import { MensualidadPage } from "@features/trust";
import { UsersAdminPage } from "@features/users";
import { StatisticsPage } from "@features/statistics";
import { ProveedorPortalPage } from "@features/supplier-portal";

function RootRedirect() {
  return <Navigate to="/home" replace />;
}

/** `/profile/:userId` → `/profile/:userId/account` */
function ProfileDefaultRedirect() {
  const { userId } = useParams();
  if (!userId) return <Navigate to="/home" replace />;
  return <Navigate to={`/profile/${userId}/account`} replace />;
}

const DEFAULT_PANEL_SECTION = "productos";

/**
 * `/:storeName/panel` (o el legado `/store/:storeId/panel`) → sección por defecto.
 * Conserva el esquema (nombre o id) por el que se llegó para no rebotar al personal.
 */
function StorePanelDefaultRedirect() {
  const { storeName, storeId } = useParams();
  if (storeName)
    return (
      <Navigate
        to={`${storePathFromName(storeName)}/panel/${DEFAULT_PANEL_SECTION}`}
        replace
      />
    );
  if (storeId)
    return (
      <Navigate to={`/store/${storeId}/panel/${DEFAULT_PANEL_SECTION}`} replace />
    );
  return <Navigate to="/home" replace />;
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
          <Route path="/staff-login" element={<StaffLoginPage />} />

          {/* Panel de administración por nombre (dueño desde su perfil). */}
          <Route
            path="/:storeName/panel"
            element={<StorePanelDefaultRedirect />}
          />
          <Route
            path="/:storeName/panel/:section"
            element={<OwnerStoreDashboard />}
          />
          <Route path="/:storeName/mapa" element={<StoreLocationMapPage />} />
          {/* Compra dentro de la tienda: {base}/{nombre}/... (React Router prioriza
              estos segmentos estáticos sobre el dinámico :productId de abajo). */}
          <Route path="/:storeName/cart" element={<CartPage />} />
          <Route path="/:storeName/checkout" element={<CheckoutPage />} />
          {/* Rastreo con el cintillo de la tienda: {base}/{nombre}/rastreo. */}
          <Route
            path="/:storeName/rastreo"
            element={<StorefrontTrackingPage />}
          />
          {/* Categoría de productos de la tienda: {base}/{nombre}/categoria/{categoria}. */}
          <Route
            path="/:storeName/categoria/:cat"
            element={<StorefrontCategoryPage kind="product" />}
          />
          {/* Categoría de servicios de la tienda: {base}/{nombre}/servicios/{categoria}. */}
          <Route
            path="/:storeName/servicios/:cat"
            element={<StorefrontCategoryPage kind="service" />}
          />
          {/* Detalle de producto dentro de la tienda: {base}/{nombre}/{productId}. */}
          <Route path="/:storeName/:productId" element={<OfferPage />} />
          {/* URL pública de la tienda: {base}/{nombre}. */}
          <Route path="/:storeName" element={<StorefrontPage />} />

          {/* Legado por id: el panel sigue funcional (staff) y el resto redirige al nombre. */}
          <Route
            path="/store/:storeId/panel"
            element={<StorePanelDefaultRedirect />}
          />
          <Route
            path="/store/:storeId/panel/:section"
            element={<OwnerStoreDashboard />}
          />
          <Route path="/store/:storeId/mapa" element={<StoreLocationMapPage />} />
          <Route path="/store/:storeId" element={<StoreLegacyRedirect />} />
          <Route
            path="/store/:storeId/vitrina"
            element={<StoreLegacyRedirect />}
          />
          <Route
            path="/store/:storeId/products"
            element={<StoreLegacyRedirect />}
          />
          <Route
            path="/store/:storeId/services"
            element={<StoreLegacyRedirect />}
          />

          <Route path="/cart" element={<LegacyStoreCartRedirect />} />
          <Route path="/checkout" element={<LegacyStoreCheckoutRedirect />} />
          <Route path="/pedido/:publicNumber" element={<OrderReceiptPage />} />
          <Route path="/rastreo" element={<TrackShipmentPage />} />
          <Route path="/mis-compras" element={<PurchaseHistoryPage />} />

          <Route path="/finanzas/deudas" element={<DebtsAdminPage />} />
          <Route path="/afiliado" element={<AffiliateDashboardPage />} />
          <Route path="/proveedor" element={<ProveedorPortalPage />} />
          <Route path="/almacen/:storeId/pedidos" element={<WarehousePortalPage />} />
          <Route path="/mensualidad" element={<MensualidadPage />} />
          <Route path="/admin/usuarios" element={<UsersAdminPage />} />
          <Route path="/estadisticas" element={<StatisticsPage />} />

          <Route path="/chat" element={<ChatLayout />}>
            <Route path=":threadId" element={<ChatPage />} />
          </Route>
          <Route
            path="/invite/presel/:threadId"
            element={<RoutePreselInvitePage />}
          />
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
