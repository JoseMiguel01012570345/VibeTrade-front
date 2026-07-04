import { Button, Spinner } from "flowbite-react";
import { Truck } from "lucide-react";
import { cn } from "@shared/lib/cn";

/** Acciones globales sobre hojas: suscriptores. */
export function RoutesRailEntryActions(props: {
  routeSheetsLoading: boolean;
  subscribersTargetSheetId: string | null;
  onOpenRouteSubscribers?: (routeSheetId: string) => void;
}) {
  const {
    routeSheetsLoading,
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
      {subscribersTargetSheetId && onOpenRouteSubscribers ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            className={cn(
              "!inline-flex shrink-0 items-center justify-center gap-1.5 min-w-0 flex-1",
            )}
            color="gray"
            onClick={() => onOpenRouteSubscribers(subscribersTargetSheetId)}
            title="Ver transportistas suscritos en la oferta pública vinculada a esta hoja (si aplica)"
          >
            <Truck className="h-4 w-4" aria-hidden />
            Suscriptores
          </Button>
        </div>
      ) : null}
    </>
  );
}
