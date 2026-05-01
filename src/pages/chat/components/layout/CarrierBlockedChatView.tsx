import type { NavigateFunction } from "react-router-dom";

type Props = {
  nav: NavigateFunction;
  offerId: string;
};

export function CarrierBlockedChatView({ nav, offerId }: Props) {
  return (
    <div className="container vt-page">
      <div className="vt-card vt-card-pad max-w-lg">
        <div className="text-lg font-black tracking-tight">
          Chat no disponible aún
        </div>
        <p className="vt-muted mt-2 text-[13px] leading-snug">
          Como transportista, necesitás una suscripción a un tramo de la hoja de
          ruta publicada (incluida una invitación aceptada). Si aún no te
          postulaste o no figura tu teléfono en la hoja, no puedes entrar a este
          chat.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="vt-btn" onClick={() => nav(-1)}>
            Volver
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={() => nav(`/offer/${offerId}`)}
          >
            Ir a la oferta de ruta
          </button>
        </div>
      </div>
    </div>
  );
}
