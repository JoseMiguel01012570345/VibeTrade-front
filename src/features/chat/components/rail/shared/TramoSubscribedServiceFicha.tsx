import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { RouteOfferTramoAssignment } from "@features/market/logic/store/marketStoreTypes";
import { offerAndStoreToPublishedTransportServiceDto } from "@features/market/logic/offerCardToPublishedTransportService";
import type { PublishedTransportServiceDto } from "@features/market/api/publishedTransportServicesApi";
import { usePublicOfferCardQuery } from "@features/market/hooks/usePublicOfferCardQuery";
import { TransportServiceFichaDetail } from "../../TransportServiceFichaDetail";

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
  const cardQuery = usePublicOfferCardQuery(storeServiceId, {
    enabled: !!storeServiceId,
  });

  const state: LoadState = useMemo(() => {
    if (!storeServiceId) return { kind: "idle" };
    if (cardQuery.isLoading || cardQuery.isFetching) return { kind: "loading" };
    if (cardQuery.isError || !cardQuery.data?.offer?.id) return { kind: "error" };
    return {
      kind: "ok",
      dto: offerAndStoreToPublishedTransportServiceDto(
        cardQuery.data.offer,
        cardQuery.data.store,
      ),
    };
  }, [storeServiceId, cardQuery.isLoading, cardQuery.isFetching, cardQuery.isError, cardQuery.data]);

  const sectionTitle = showCarrierLine
    ? "Ficha del servicio (suscripción al tramo)"
    : "Servicio de transporte";
  const confirmed = assignment.status === "confirmed";
  const statusHint = confirmed ? " · confirmado" : " · pendiente de validación";

  let catalogSection: ReactNode = null;
  if (!storeServiceId) {
    catalogSection = (
      <p className="mb-0 text-[12px] leading-snug text-[var(--text)]">
        {assignment.vehicleLabel?.trim() ||
          "Este transportista no eligió una ficha de catálogo al suscribirse (solo texto libre)."}
      </p>
    );
  } else if (state.kind === "loading") {
    catalogSection = (
      <p className="vt-muted mb-0 text-[12px]">Cargando ficha…</p>
    );
  } else if (state.kind === "error") {
    catalogSection = (
      <p className="mb-0 text-[12px] text-[var(--muted)]">
        No se pudo cargar la ficha pública.{" "}
        <Link
          to={`/offer/${encodeURIComponent(storeServiceId)}`}
          className="font-extrabold text-[var(--primary)] no-underline hover:underline"
        >
          Abrir en la tienda
        </Link>
      </p>
    );
  } else if (state.kind === "ok") {
    catalogSection = (
      <div className="space-y-2">
        <TransportServiceFichaDetail s={state.dto} />
        <Link
          to={`/offer/${encodeURIComponent(storeServiceId)}`}
          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[var(--primary)] no-underline hover:underline"
        >
          Ver ficha completa <ExternalLink size={12} aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-2.5 py-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">
        {sectionTitle}
      </div>
      {showCarrierLine ? (
        <p className="mb-2 mt-1 text-[11px] font-semibold leading-snug text-[var(--text)]">
          {assignment.displayName?.trim() || "Transportista"}
          <span className="vt-muted font-normal">{statusHint}</span>
        </p>
      ) : (
        <p className="mb-2 mt-1 text-[10px] font-semibold leading-snug text-[var(--muted)]">
          {confirmed ? "Suscripción confirmada" : "Pendiente de validación"}
        </p>
      )}
      {catalogSection}
    </div>
  );
}
