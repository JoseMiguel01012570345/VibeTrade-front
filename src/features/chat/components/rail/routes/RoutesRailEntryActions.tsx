import { Button, Spinner } from "flowbite-react";
import { MapPin, Truck } from "lucide-react";
import { cn } from "@shared/lib/cn";

/** Acciones globales sobre hojas: alta y suscriptores. */
export function RoutesRailEntryActions(props: {
  routeSheetsLoading: boolean;
  isActingSeller: boolean;
  onOpenNewRouteSheet: () => void;
  subscribersTargetSheetId: string | null;
  onOpenRouteSubscribers?: (routeSheetId: string) => void;
}) {
  const {
    routeSheetsLoading,
    isActingSeller,
    onOpenNewRouteSheet,
    subscribersTargetSheetId,
    onOpenRouteSubscribers,
  } = props;

  return (
    <>
      {routeSheetsLoading ? (
        <div className="vt-muted mb-2 flex items-center gap-2 px-1 text-[13px] font-semibold">
          <Spinner aria-hidden size="sm" />
          Cargando hojas de ruta...
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap gap-2">
        {isActingSeller ? (
          <Button
            className={cn(
              "min-w-0 flex-1 shrink-0 justify-center [&>span]:inline-flex [&>span]:items-center [&>span]:gap-2",
            )}
            color="blue"
            onClick={onOpenNewRouteSheet}
          >
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Nueva hoja de ruta</span>
          </Button>
        ) : null}

        {subscribersTargetSheetId && onOpenRouteSubscribers ? (
          <Button
            className={cn(
              "!inline-flex shrink-0 items-center justify-center gap-1.5",
              !isActingSeller && "min-w-0 flex-1",
            )}
            color="gray"
            onClick={() => onOpenRouteSubscribers(subscribersTargetSheetId)}
            title="Ver transportistas suscritos en la oferta pública vinculada a esta hoja (si aplica)"
          >
            <Truck className="h-4 w-4" aria-hidden />
            Suscriptores
          </Button>
        ) : null}
      </div>
    </>
  );
}
