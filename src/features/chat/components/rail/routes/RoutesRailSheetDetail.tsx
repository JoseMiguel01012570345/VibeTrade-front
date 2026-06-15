import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import type { RoutesRailSheetDetailProps } from "./routesRailSheetDetailTypes";
import { composeRoutesRailDetailShellMerged } from "./routesRailSheetDetailComposer";
import { RoutesRailSheetDetailShell } from "./RoutesRailSheetDetailShell";
import { RouteSheetActionConfirmModal } from "./RouteSheetActionConfirmModal";
import {
  buildRoutesRailUnpublishConfirmMessage,
  runRoutesRailDeleteConfirmation,
  runRoutesRailPublishToggle,
} from "./RoutesRailDetailSections";
import { railBuildDeleteSheetConfirmMessage } from "./routesRailSheetStrings";

export type {
  CedeOwnershipModalState,
  CarrierEvEditModalState,
  CarrierEvReadModalState,
} from "../shared/routesRailSheetModalTypes";
export type { RoutesRailSheetDetailProps } from "./routesRailSheetDetailTypes";

type PendingConfirm = "delete" | "unpublish";

/** Detalle de una hoja de ruta seleccionada: barra de acciones, mercancías, mapa en vivo y lista de tramos con logística. */
export function RoutesRailSheetDetail(props: RoutesRailSheetDetailProps) {
  const navigate = useNavigate();
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null,
  );

  const openDeleteConfirm = useCallback(() => setPendingConfirm("delete"), []);
  const openUnpublishConfirm = useCallback(
    () => setPendingConfirm("unpublish"),
    [],
  );
  const closeConfirm = useCallback(() => setPendingConfirm(null), []);

  const handlePublishClick = useCallback(() => {
    if (props.selRoute.publicadaPlataforma) {
      openUnpublishConfirm();
      return;
    }
    runRoutesRailPublishToggle({
      selRoute: props.selRoute,
      sheetLockedByPaid: props.sheetLockedByPaid,
      threadId: props.threadId,
      publishRouteSheetsToPlatform: props.publishRouteSheetsToPlatform,
      unpublishRouteSheetFromPlatform: props.unpublishRouteSheetFromPlatform,
    });
  }, [openUnpublishConfirm, props]);

  const handleDuplicateRouteSheet = useCallback(() => {
    void (async () => {
      const newId = await props.duplicateRouteSheet(
        props.threadId,
        props.selRoute.id,
      );
      if (!newId) {
        toast.error("No se pudo duplicar la hoja de ruta.");
        return;
      }
      toast.success("Hoja de ruta duplicada.");
      props.setSelRouteId(newId);
    })();
  }, [props]);

  const shellMerged = useMemo(
    () =>
      composeRoutesRailDetailShellMerged(navigate, props, {
        onRequestDelete: openDeleteConfirm,
        onPublishClick: handlePublishClick,
        onDuplicateRouteSheet: handleDuplicateRouteSheet,
      }),
    [
      navigate,
      props,
      openDeleteConfirm,
      handlePublishClick,
      handleDuplicateRouteSheet,
    ],
  );

  const deleteMessage = railBuildDeleteSheetConfirmMessage(
    props.selRoute,
    props.routeOfferResolved,
  );
  const unpublishMessage = buildRoutesRailUnpublishConfirmMessage(
    props.selRoute,
  );

  return (
    <>
      <RoutesRailSheetDetailShell {...shellMerged} />
      <RouteSheetActionConfirmModal
        open={pendingConfirm === "delete"}
        title="Eliminar hoja de ruta"
        message={deleteMessage}
        confirmLabel="Eliminar"
        confirmColor="failure"
        onCancel={closeConfirm}
        onConfirm={() => {
          runRoutesRailDeleteConfirmation({
            selRoute: props.selRoute,
            routeOfferResolved: props.routeOfferResolved,
            sheetLockedByPaid: props.sheetLockedByPaid,
            deleteRouteSheet: props.deleteRouteSheet,
            threadId: props.threadId,
            setSelRouteId: props.setSelRouteId,
          });
          closeConfirm();
        }}
      />
      <RouteSheetActionConfirmModal
        open={pendingConfirm === "unpublish"}
        title="Ocultar de la plataforma"
        message={unpublishMessage}
        confirmLabel="Ocultar"
        confirmColor="gray"
        onCancel={closeConfirm}
        onConfirm={() => {
          runRoutesRailPublishToggle({
            selRoute: props.selRoute,
            sheetLockedByPaid: props.sheetLockedByPaid,
            threadId: props.threadId,
            publishRouteSheetsToPlatform: props.publishRouteSheetsToPlatform,
            unpublishRouteSheetFromPlatform: props.unpublishRouteSheetFromPlatform,
          });
          closeConfirm();
        }}
      />
    </>
  );
}
