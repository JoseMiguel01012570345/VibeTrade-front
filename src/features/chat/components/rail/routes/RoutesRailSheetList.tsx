import { ChevronRight } from "lucide-react";
import { Badge } from "flowbite-react";
import type { RouteOfferPublicState } from "@features/market/model/store/marketStoreTypes";
import type { RouteSheet } from "@features/chat/model/routeSheetTypes";
import { routeStatusLabel } from "@features/chat/model/routeSheetTypes";
import { sheetPreviewContactLine } from "@features/chat/model/routeSheetOfferGuards";
import { railItemClass } from "../layout/chatRailStyles";
import { routesRailSheetListEmptyText } from "./routesRailSheetStrings";

type Props = {
  routeSheets: RouteSheet[];
  isActingSeller: boolean;
  routeOfferResolved: RouteOfferPublicState | undefined;
  onSelectSheetId: (id: string) => void;
};

/** Listado compacto del rail (vacío o lista de tarjetas clicable). Solo cuando no hay detalle seleccionado. */
export function RoutesRailSheetList({
  routeSheets,
  isActingSeller,
  routeOfferResolved,
  onSelectSheetId,
}: Props) {
  // Estados

  // Funciones
  const captionVacio = routesRailSheetListEmptyText(isActingSeller);

  // useEffects

  // Vista (HTML + CSS)
  if (routeSheets.length === 0) {
    return <p className="vt-muted px-1 py-3 text-[13px]">{captionVacio}</p>;
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {routeSheets.map((r) => (
        <RoutesRailSheetListItemCard
          key={r.id}
          r={r}
          routeOfferResolved={routeOfferResolved}
          onSelectSheetId={onSelectSheetId}
        />
      ))}
    </ul>
  );
}

function RoutesRailSheetListItemCard(props: {
  r: RouteSheet;
  routeOfferResolved: RouteOfferPublicState | undefined;
  onSelectSheetId: (id: string) => void;
}) {
  // Estados
  const { r, routeOfferResolved, onSelectSheetId } = props;

  // Funciones
  const preview = sheetPreviewContactLine(r, routeOfferResolved);

  // useEffects

  // Vista (HTML + CSS)
  return (
    <li>
      <button
        type="button"
        className={railItemClass}
        onClick={() => onSelectSheetId(r.id)}
      >
        <RoutesRailSheetListCardHeader r={r} />
        {preview ? RoutesRailSheetListContactLine(preview) : null}
        <ChevronRight
          size={16}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-45"
          aria-hidden
        />
      </button>
    </li>
  );
}

function RoutesRailSheetListCardHeader(props: { r: RouteSheet }) {
  // Estados
  const r = props.r;

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-extrabold leading-tight">
          {r.titulo}
        </span>
        <Badge className="rounded-full uppercase" color="dark" size="sm">
          {routeStatusLabel(r.estado)}
        </Badge>
      </div>
      <div className="mt-1 text-[11px] text-[var(--muted)]">
        {r.paradas.length} tramo{r.paradas.length === 1 ? "" : "s"}
        {r.publicadaPlataforma ? (
          <span className="font-bold text-[color-mix(in_oklab,var(--primary)_85%,var(--muted))]">
            {" "}
            · Plataforma
          </span>
        ) : null}
      </div>
    </>
  );
}

function RoutesRailSheetListContactLine(line: string) {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <div className="mt-1 line-clamp-2 text-left text-[10px] font-semibold leading-snug text-[var(--text)]">
      <span className="text-[var(--muted)]">Contacto: </span>
      {line}
    </div>
  );
}
