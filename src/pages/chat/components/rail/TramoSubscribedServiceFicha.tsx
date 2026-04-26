import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { RouteOfferTramoAssignment } from "../../../../app/store/marketStoreTypes";
import { fetchPublicOfferCard } from "../../../../utils/market/marketPersistence";
import { offerAndStoreToPublishedTransportServiceDto } from "../../../../utils/market/offerCardToPublishedTransportService";
import type { PublishedTransportServiceDto } from "../../../../utils/market/publishedTransportServicesApi";
import { TransportServiceFichaDetail } from "../TransportServiceFichaDetail";

type Props = {
  assignment: RouteOfferTramoAssignment;
  /** Si es false, no repite nombre del transportista (el padre ya lo muestra). */
  showCarrierLine?: boolean;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; dto: PublishedTransportServiceDto }
  | { kind: "error" };

export function TramoSubscribedServiceFicha({
  assignment,
  showCarrierLine = true,
}: Props) {
  const storeServiceId = assignment.storeServiceId?.trim();
  const [state, setState] = useState<LoadState>(() =>
    storeServiceId ? { kind: "loading" } : { kind: "idle" },
  );

  useEffect(() => {
    if (!storeServiceId) {
      setState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    void fetchPublicOfferCard(storeServiceId)
      .then((card) => {
        if (cancelled) return;
        if (!card?.offer?.id) {
          setState({ kind: "error" });
          return;
        }
        setState({
          kind: "ok",
          dto: offerAndStoreToPublishedTransportServiceDto(
            card.offer,
            card.store,
          ),
        });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [storeServiceId]);

  return (
    <div className="mt-2 rounded-lg border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-2.5 py-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">
        {showCarrierLine
          ? "Ficha del servicio (suscripción al tramo)"
          : "Servicio de transporte"}
      </div>
      {showCarrierLine ? (
        <p className="mb-2 mt-1 text-[11px] font-semibold leading-snug text-[var(--text)]">
          {assignment.displayName?.trim() || "Transportista"}
          {assignment.status === "confirmed" ? (
            <span className="vt-muted font-normal"> · confirmado</span>
          ) : (
            <span className="vt-muted font-normal">
              {" "}
              · pendiente de validación
            </span>
          )}
        </p>
      ) : (
        <p className="mb-2 mt-1 text-[10px] font-semibold leading-snug text-[var(--muted)]">
          {assignment.status === "confirmed"
            ? "Suscripción confirmada"
            : "Pendiente de validación"}
        </p>
      )}
      {!storeServiceId ? (
        <p className="mb-0 text-[12px] leading-snug text-[var(--text)]">
          {assignment.vehicleLabel?.trim() ||
            "Este transportista no eligió una ficha de catálogo al suscribirse (solo texto libre)."}
        </p>
      ) : state.kind === "loading" ? (
        <p className="vt-muted mb-0 text-[12px]">Cargando ficha…</p>
      ) : state.kind === "error" ? (
        <p className="mb-0 text-[12px] text-[var(--muted)]">
          No se pudo cargar la ficha pública.{" "}
          <Link
            to={`/offer/${encodeURIComponent(storeServiceId)}`}
            className="font-extrabold text-[var(--primary)] no-underline hover:underline"
          >
            Abrir en la tienda
          </Link>
        </p>
      ) : state.kind === "ok" ? (
        <div className="space-y-2">
          <TransportServiceFichaDetail s={state.dto} />
          <Link
            to={`/offer/${encodeURIComponent(storeServiceId)}`}
            className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[var(--primary)] no-underline hover:underline"
          >
            Ver ficha completa <ExternalLink size={12} aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
