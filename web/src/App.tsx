import { Navigate, Route, Routes } from "react-router-dom";
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
import { PhoneEntryPage } from "./pages/onboarding/PhoneEntryPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/onboarding/phone" replace />} />

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
    </Routes>
  );
}
