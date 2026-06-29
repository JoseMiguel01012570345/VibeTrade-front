import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppStore } from "@features/auth/store/useAppStore";

export function SessionGate() {
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
