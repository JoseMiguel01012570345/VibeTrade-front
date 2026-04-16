import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { useAppStore } from "./app/store/useAppStore";
import { AppShell } from "./app/shell/AppShell";
import { ChatListPage } from "./pages/chat/ChatListPage";
import { ChatPage } from "./pages/chat/ChatPage";
import { HomePage } from "./pages/home/HomePage";
import { NotificationsPage } from "./pages/notifications/NotificationsPage";
import { OfferPage } from "./pages/offer/OfferPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { ReelsPage } from "./pages/reels/ReelsPage";
import { StorePage } from "./pages/store/StorePage";
import { OtpPage } from "./pages/onboarding/OtpPage";
import { OnboardingWelcomePage } from "./pages/onboarding/OnboardingWelcomePage";
import { PhoneEntryPage } from "./pages/onboarding/PhoneEntryPage";
import { CatalogSearchPage } from "./pages/search/CatalogSearchPage";
import { StoresSearchPage } from "./pages/stores/StoresSearchPage";

function SessionGate() {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const { pathname } = useLocation();

  if (!isSessionActive) {
    const blocked =
      pathname.startsWith("/chat") ||
      pathname.startsWith("/reels") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/notifications");
    if (blocked) return <Navigate to="/home" replace />;
  }
  if (isSessionActive && pathname.startsWith("/onboarding")) {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}

function RootRedirect() {
  return <Navigate to="/home" replace />;
}

/** `/profile/:userId` → `/profile/:userId/account` */
function ProfileDefaultRedirect() {
  const { userId } = useParams();
  if (!userId) return <Navigate to="/home" replace />;
  return <Navigate to={`/profile/${userId}/account`} replace />;
}

export default function App() {
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
          <Route path="/offer/:offerId" element={<OfferPage />} />
          <Route path="/store/:storeId" element={<StorePage />} />
          <Route path="/store/:storeId/vitrina" element={<StorePage />} />
          <Route path="/store/:storeId/products" element={<StorePage />} />
          <Route path="/store/:storeId/services" element={<StorePage />} />

          <Route path="/chat" element={<ChatListPage />} />
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
