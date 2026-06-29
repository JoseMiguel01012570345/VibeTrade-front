import toast from "react-hot-toast";
import type { NavigateFunction } from "react-router-dom";
import { useAppStore } from "@features/auth/store/useAppStore";
import { setSessionToken } from "@shared/services/http/sessionToken";
import { stopChatRealtime } from "@features/chat/model/chatRealtime";
import { bootstrapWebApp } from "@app/bootstrap/bootstrapWebApp";
import {
  userFromSessionJson,
  type SessionUserJson,
} from "@features/auth/api/sessionUser";

export async function applyAuthSession(
  json: { sessionToken: string; user: SessionUserJson },
  nav: NavigateFunction,
  options?: {
    successMessage?: string;
    redirectTo?: string;
  },
) {
  const setSessionActive = useAppStore.getState().setSessionActive;
  const applySessionUser = useAppStore.getState().applySessionUser;

  setSessionToken(json.sessionToken);
  stopChatRealtime();
  applySessionUser(userFromSessionJson(json.user));
  if (options?.successMessage) toast.success(options.successMessage);
  setSessionActive(true);
  await bootstrapWebApp();
  nav(options?.redirectTo ?? "/home", { replace: true });
}
