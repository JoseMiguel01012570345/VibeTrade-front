import { toast } from "sonner";
import {
  errorToUserMessage,
} from "@shared/services/http/apiErrorMessage";
import { VtHttpError } from "@shared/services/http/VtHttpError";
import { useAppStore } from "./useAppStore";

const AUTH_REQUIRED_MARKERS = [
  "falta el encabezado authorization",
  "token de sesión inválido o expirado",
] as const;

/** 401 o mensaje del middleware Bearer: el usuario debe iniciar sesión. */
export function isAuthRequiredApiError(e: unknown): boolean {
  if (e instanceof VtHttpError && e.status === 401) return true;
  const msg = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  return AUTH_REQUIRED_MARKERS.some((marker) => msg.includes(marker));
}

/** Abre el modal de login/registro si el error exige autenticación. */
export function openAuthModalForApiError(e: unknown): boolean {
  if (!isAuthRequiredApiError(e)) return false;
  useAppStore.getState().openAuthModal();
  return true;
}

/** Toast de error API; si falta sesión, abre el modal y no muestra el mensaje técnico. */
export function toastApiError(
  e: unknown,
  fallback?: string,
): void {
  if (openAuthModalForApiError(e)) return;
  toast.error(errorToUserMessage(e, fallback));
}
