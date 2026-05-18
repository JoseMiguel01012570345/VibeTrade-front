import { confirmedCarrierIdsOnOffer } from "@app/store/marketSliceHelpers";
import type { RouteOfferPublicState } from "@app/store/marketStoreTypes";
import type { RouteSheet } from "@features/market/model/routeSheetTypes";
import { ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES } from "@features/market/model/routeSheetOfferGuards";
import { SELLER_TRUST_PENALTY_ON_EDIT } from "../../modals/TrustRiskEditConfirmModal";

export function routesRailSheetListEmptyText(isActingSeller: boolean): string {
  return isActingSeller
    ? "Crea una hoja de ruta y vinculala al acuerdo desde Contratos (con mercancías) antes de publicar en la plataforma."
    : "La tienda creará y editará la hoja de ruta; aquí podrás ver el avance cuando exista.";
}

export function railDetailSellerEditTitle(
  actionsLocked: boolean,
  sheetLockedByPaid: boolean,
  sheetEditBlockedByCarrierAck: boolean,
  publicadaPlataforma: boolean,
): string {
  if (actionsLocked) return "No disponible hasta registrar el pago";
  if (sheetLockedByPaid) return ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES;
  if (sheetEditBlockedByCarrierAck) {
    return "Esperá a que todos los transportistas en el hilo acepten o rechacen la última edición";
  }
  return publicadaPlataforma
    ? "Editar: se notifica en el chat y los transportistas pueden aceptar o rechazar (demo)"
    : "Editar hoja de ruta";
}

export function railInviteTitle(
  actionsLocked: boolean,
  sheetLockedByPaid: boolean,
): string {
  if (actionsLocked) return "No disponible hasta registrar el pago";
  if (sheetLockedByPaid) return ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES;
  return "Invitar transportista a la hoja de ruta";
}

export function railDetailDeleteTitle(
  actionsLocked: boolean,
  sheetLockedByPaid: boolean,
): string {
  if (actionsLocked) return "No disponible hasta registrar el pago";
  if (sheetLockedByPaid) return ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES;
  return "Eliminar la hoja: los transportistas con tramo en la oferta salen del chat; penalización a la tienda por cada confirmado (demo)";
}

export function railDetailPublishTitle(
  actionsLocked: boolean,
  sheetLockedByPaid: boolean,
  linked: boolean,
  publicadaPlataforma: boolean,
): string {
  if (actionsLocked) return "No disponible hasta registrar el pago";
  if (sheetLockedByPaid) return ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES;
  if (!linked)
    return "Vinculá esta hoja a un acuerdo en Contratos antes de publicar";
  return publicadaPlataforma
    ? "Dejar de mostrar la hoja en el mercado y búsqueda"
    : "Publicar la hoja en el mercado (demo)";
}

export function railSellerToggleStopTitle(
  actionsLocked: boolean,
  sheetLockedByPaid: boolean,
): string {
  if (actionsLocked) return "No disponible hasta registrar el pago";
  if (sheetLockedByPaid) return ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES;
  return "Marcar tramo";
}

export function railBuildDeleteSheetConfirmMessage(
  selRoute: RouteSheet,
  routeOfferResolved: RouteOfferPublicState | undefined,
): string {
  const offerForSheet =
    routeOfferResolved?.routeSheetId === selRoute.id
      ? routeOfferResolved
      : undefined;
  const nConf = offerForSheet
    ? confirmedCarrierIdsOnOffer(offerForSheet, selRoute.id).size
    : 0;
  const hasAssigned =
    !!offerForSheet && offerForSheet.tramos.some((t) => t.assignment?.userId);

  let msg = `¿Eliminar la hoja de ruta «${selRoute.titulo}»? Se quitará el vínculo en los acuerdos.`;
  if (hasAssigned) {
    msg += " Los transportistas con tramo en la oferta saldrán del chat.";
  }
  if (nConf > 0) {
    const totalPen = nConf * SELLER_TRUST_PENALTY_ON_EDIT;
    msg += ` Se descontarán ${totalPen} puntos de confianza de la tienda (${nConf} transportista${nConf === 1 ? "" : "s"} confirmado${nConf === 1 ? "" : "s"}; demo).`;
  }
  return msg;
}
