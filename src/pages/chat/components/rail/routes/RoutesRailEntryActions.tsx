import { Button, Spinner } from "flowbite-react";
import { MapPin, Truck } from "lucide-react";
import { cn } from "../../../../../lib/cn";

/** Acciones globales sobre hojas: alta y suscriptores. */
export function RoutesRailEntryActions(props: {
  routeSheetsLoading: boolean;
  isActingSeller: boolean;
  hasAcceptedContract: boolean;
  actionsLocked: boolean;
  routeSheetCapReached: boolean;
  onOpenNewRouteSheet: () => void;
  subscribersTargetSheetId: string | null;
  onOpenRouteSubscribers?: (routeSheetId: string) => void;
}) {
  const {
    routeSheetsLoading,
    isActingSeller,
    hasAcceptedContract,
    actionsLocked,
    routeSheetCapReached,
    onOpenNewRouteSheet,
    subscribersTargetSheetId,
    onOpenRouteSubscribers,
  } = props;

  const blockedNewSheet =
    actionsLocked || !hasAcceptedContract || routeSheetCapReached;
  const titleNewSheet = actionsLocked
    ? "No disponible hasta registrar el pago en el chat"
    : !hasAcceptedContract
      ? "Necesitas al menos un contrato aceptado para crear una hoja de ruta"
      : routeSheetCapReached
        ? "No puedes tener más hojas de ruta que acuerdos: emite otro acuerdo o elimina una hoja"
        : undefined;

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
            disabled={blockedNewSheet}
            title={titleNewSheet ?? undefined}
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
