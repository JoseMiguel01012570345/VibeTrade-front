import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CarrierRoutePreselInviteModal } from "./components/modals/CarrierRoutePreselInviteModal";

/**
 * Invitación presel: carga la hoja vía GET presel-preview (sin acceso al hilo).
 * Tras aceptar, el transportista puede abrir el chat.
 */
export function RoutePreselInvitePage() {
  const { threadId } = useParams<{ threadId: string }>();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const sheet = searchParams.get("sheet")?.trim() ?? "";
  const stopsRaw = searchParams.get("stops")?.trim();
  const stopIds = stopsRaw
    ? stopsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  if (!threadId?.startsWith("cth_") || !sheet) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">
          Enlace inválido o incompleto. Abrí la invitación desde la
          notificación.
        </div>
      </div>
    );
  }

  return (
    <div className="vt-page min-h-[50vh]">
      <CarrierRoutePreselInviteModal
        open
        threadId={threadId}
        routeSheetId={sheet}
        highlightStopIds={stopIds}
        onClose={() => nav("/home", { replace: true })}
        onAccepted={() => {
          nav(`/chat/${encodeURIComponent(threadId)}`, { replace: true });
        }}
      />
    </div>
  );
}
