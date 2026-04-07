import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
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

function SessionGate() {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const { pathname } = useLocation();

  if (!isSessionActive && !pathname.startsWith("/onboarding")) {
    return <Navigate to="/onboarding" replace />;
  }
  if (isSessionActive && pathname.startsWith("/onboarding")) {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}

function RootRedirect() {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  return (
    <Navigate to={isSessionActive ? "/home" : "/onboarding"} replace />
  );
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
          <Route path="/offer/:offerId" element={<OfferPage />} />
          <Route path="/store/:storeId" element={<StorePage />} />

          <Route path="/chat" element={<ChatListPage />} />
          <Route path="/chat/:threadId" element={<ChatPage />} />
          <Route path="/reels" element={<ReelsPage />} />

          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
