import type {
  MarketState,
  RouteOfferPublicState,
  RouteOfferTramoAssignment,
  RouteOfferTramoPublic,
  Thread,
} from "../../../app/store/marketStoreTypes";
import { threadHasAcceptedAgreement } from "../../../app/store/marketStoreTypes";
import type {
  RouteSheet,
  RouteSheetCreatePayload,
  RouteStop,
} from "./routeSheetTypes";

/** Mensaje cuando el comprador del hilo intenta suscribirse como transportista a la misma hoja publicada. */
export const ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES =
  "No podés suscribirte como transportista: en esta operación sos el comprador con un acuerdo aceptado.";

/** Prioridad: teléfono en la parada de la hoja → asignación en la oferta → campo público del tramo. */
export function effectiveTramoContactPhone(
  stop: RouteStop,
  offerTramo?: RouteOfferTramoPublic | null,
): string | undefined {
  const h = stop.telefonoTransportista?.trim();
  if (h) return h;
  const fromAssign = offerTramo?.assignment?.phone?.trim();
  if (fromAssign) return fromAssign;
  const fromPublic = offerTramo?.telefonoTransportista?.trim();
  if (fromPublic) return fromPublic;
  return undefined;
}

/** Texto compacto para listados (preview): teléfonos por tramo en orden. */
export function sheetPreviewContactLine(
  sheet: RouteSheet,
  routeOffer: RouteOfferPublicState | undefined,
): string | null {
  const parts: string[] = [];
  for (const p of sheet.paradas) {
    const ot =
      routeOffer?.routeSheetId === sheet.id
        ? routeOffer.tramos.find((t) => t.stopId === p.id)
        : undefined;
    const tel = effectiveTramoContactPhone(p, ot);
    if (tel) parts.push(tel);
  }
  return parts.length ? parts.join(" · ") : null;
}

/** True si la oferta pública está ligada a esta hoja y algún tramo ya tiene transportista confirmado. */
export function routeSheetHasConfirmedCarriersOnOffer(
  offer: RouteOfferPublicState | undefined,
  sheetId: string,
): boolean {
  return (
    offer?.routeSheetId === sheetId &&
    (offer.tramos?.some((t) => t.assignment?.status === "confirmed") ?? false)
  );
}

/** Normaliza teléfono para comparar hoja vs asignación en oferta. */
export function normRoutePhoneKey(phone: string | undefined): string {
  return (phone ?? "").replace(/[\s.]/g, "").replace(/-/g, "");
}

export type RouteSheetPreselectedInvite = { stopId: string; phone: string };

/**
 * Invitaciones presel solo donde el teléfono del tramo cambió respecto a la hoja previa
 * (misma parada por `paradaId`; sin id de parada persistida no se presel-notifica — p. ej. tramo recién insertado).
 */
export function preselInvitesForTramoPhoneEdits(
  initial: RouteSheet | null | undefined,
  paradasFinal: RouteSheetCreatePayload["paradas"],
): RouteSheetPreselectedInvite[] {
  const invites: RouteSheetPreselectedInvite[] = [];
  for (let i = 0; i < paradasFinal.length; i++) {
    const p = paradasFinal[i]!;
    const stopId = p.paradaId?.trim() || "";
    const nu = p.telefonoTransportista?.trim() ?? "";
    if (!stopId || !nu) continue;
    const oldStop = initial?.paradas.find(
      (x) => (x.id ?? "").trim() === stopId,
    );
    const ou = oldStop?.telefonoTransportista?.trim() ?? "";
    if (normRoutePhoneKey(ou) !== normRoutePhoneKey(nu)) {
      invites.push({ stopId, phone: nu });
    }
  }
  return invites;
}

/** Hay transportista con tramo confirmado en la oferta pública para esta parada. */
export function confirmedAssignmentOnStop(
  offer: RouteOfferPublicState | undefined,
  sheetId: string | undefined,
  stopId: string | undefined,
): RouteOfferTramoAssignment | null {
  const sid = sheetId?.trim();
  const pid = stopId?.trim();
  if (!offer?.tramos || !sid || !pid) return null;
  if (offer.routeSheetId?.trim() !== sid) return null;
  const t = offer.tramos.find((x) => x.stopId === pid);
  const a = t?.assignment;
  if (a?.status === "confirmed") return a;
  return null;
}

/**
 * Id de parada alineado con la oferta: fila del form (`paradaId`) o, al editar,
 * el id de la parada i-ésima guardada en la hoja (si el estado del form aún no tiene `paradaId`).
 */
export function resolveRouteStopIdForFormRow(
  formParadaId: string | undefined,
  sheetParadaAtIndex: { id: string } | undefined,
): string | undefined {
  const a = formParadaId?.trim();
  if (a) return a;
  return sheetParadaAtIndex?.id?.trim();
}

/** Misma regla que `confirmedAssignmentOnStop`, con resolución de id de parada para el formulario. */
export function confirmedAssignmentOnFormTramo(
  offer: RouteOfferPublicState | undefined,
  sheetId: string | undefined,
  formParadaId: string | undefined,
  sheetParadaAtIndex: { id: string } | undefined,
): RouteOfferTramoAssignment | null {
  return confirmedAssignmentOnStop(
    offer,
    sheetId,
    resolveRouteStopIdForFormRow(formParadaId, sheetParadaAtIndex),
  );
}

/**
 * Asignación pendiente o confirmada en el tramo del formulario (p. ej. enlace a la ficha del servicio del transportista).
 */
export function activeAssignmentOnFormTramo(
  offer: RouteOfferPublicState | undefined,
  sheetId: string | undefined,
  formParadaId: string | undefined,
  sheetParadaAtIndex: { id: string } | undefined,
): RouteOfferTramoAssignment | null {
  const sid = sheetId?.trim();
  const stopId = resolveRouteStopIdForFormRow(
    formParadaId,
    sheetParadaAtIndex,
  )?.trim();
  if (!offer?.tramos?.length || !sid || !stopId) return null;
  if (offer.routeSheetId?.trim() !== sid) return null;
  const t = offer.tramos.find((x) => x.stopId === stopId);
  const a = t?.assignment;
  if (!a) return null;
  if (a.status !== "pending" && a.status !== "confirmed") return null;
  return a;
}

/** Tras borrar un acuerdo quedarían `contracts.length - 1` acuerdos; las hojas no pueden superar ese número. */
export function agreementDeleteBlockedByRouteSheetInvariant(
  contractCount: number,
  routeSheetCount: number,
): boolean {
  if (contractCount === 0) return routeSheetCount > 0;
  return routeSheetCount > contractCount - 1;
}

/** Tramos de la oferta con asignación confirmada para el transportista. */
export function confirmedStopIdsForCarrier(
  ro: RouteOfferPublicState | undefined,
  userId: string,
): Set<string> {
  const out = new Set<string>();
  if (!ro) return out;
  for (const t of ro.tramos) {
    if (t.assignment?.userId === userId && t.assignment.status === "confirmed")
      out.add(t.stopId);
  }
  return out;
}

/**
 * Acceso al hilo como transportista: suscripción registrada (p. ej. invitación presel o postulación),
 * aún pendiente de confirmación por comprador/vendedor o ya confirmada.
 */
export function carrierHasChatAccessTramoOnOffer(
  ro: RouteOfferPublicState | undefined,
  userId: string,
): boolean {
  const uid = userId.trim();
  if (!ro || !uid) return false;
  return ro.tramos.some((t) => {
    const a = t.assignment;
    if (a?.userId !== uid) return false;
    return a.status === "confirmed" || a.status === "pending";
  });
}

export function tramoNotifyLineFromOffer(
  ro: RouteOfferPublicState | undefined,
  stopId: string,
): string {
  const t = ro?.tramos.find((x) => x.stopId === stopId);
  if (!t) return "un tramo nuevo";
  return `Tramo ${t.orden} (${t.origenLine} → ${t.destinoLine})`;
}

/**
 * True si el usuario no debe poder suscribirse como transportista a esta oferta pública de ruta:
 * está vinculada al hilo donde es comprador y ya hay acuerdo aceptado.
 */
export function routeOfferPublicBlockedForBuyerWithAgreement(
  routeOffer: RouteOfferPublicState | undefined,
  threads: Record<string, Thread>,
  viewerId: string,
): boolean {
  const tid = routeOffer?.threadId?.trim();
  if (!tid || !viewerId || viewerId === "guest") return false;
  const th = threads[tid];
  if (!th) return false;
  if (th.buyerUserId !== viewerId) return false;
  return threadHasAcceptedAgreement(th);
}

/**
 * `routeOfferPublic` suele estar bajo el id de catálogo; el hilo puede tener `offerId` = publicación `emo_*`.
 * Resuelve la entrada correcta para el panel de suscriptores, bloqueo de transportista, etc.
 */
export function resolveRouteOfferPublicForThread(
  state: Pick<MarketState, "threads" | "routeOfferPublic" | "offers">,
  thread: Thread | undefined,
): RouteOfferPublicState | undefined {
  if (!thread) return undefined;
  const direct = state.routeOfferPublic[thread.offerId];
  if (direct) return direct;
  const offer = state.offers[thread.offerId];
  const base = offer?.emergentBaseOfferId?.trim();
  if (base) {
    const fromBase = state.routeOfferPublic[base];
    if (fromBase) return fromBase;
  }
  for (const ro of Object.values(state.routeOfferPublic)) {
    if (ro.threadId === thread.id) return ro;
  }
  return undefined;
}

/**
 * Oferta pública de **esta** hoja (mismo hilo puede tener varias hojas / varias ofertas en `routeOfferPublic`).
 * El modal de edición debe usar esto, no `resolveRouteOfferPublicForThread`, para bloquear teléfono y validar
 * tramos con transportista confirmado en la hoja correcta.
 */
export function resolveRouteOfferPublicForSheet(
  state: Pick<MarketState, "threads" | "routeOfferPublic" | "offers">,
  thread: Thread | undefined,
  routeSheetId: string | undefined,
): RouteOfferPublicState | undefined {
  if (!thread || !routeSheetId?.trim()) return undefined;
  const rsid = routeSheetId.trim();
  for (const ro of Object.values(state.routeOfferPublic)) {
    if (ro.threadId === thread.id && ro.routeSheetId?.trim() === rsid) {
      return ro;
    }
  }
  const fallback = resolveRouteOfferPublicForThread(state, thread);
  if (fallback?.routeSheetId?.trim() === rsid) return fallback;
  return undefined;
}

/**
 * Oferta para el formulario de hoja: la resuelta por hoja, o la del hilo solo si `routeSheetId` coincide
 * (cuando `resolveRouteOfferPublicForSheet` aún no encuentra entrada en el store).
 */
export function effectiveRouteOfferForSheetForm(
  perSheet: RouteOfferPublicState | undefined,
  forThread: RouteOfferPublicState | undefined,
  editingSheetId: string | undefined,
): RouteOfferPublicState | undefined {
  if (perSheet) return perSheet;
  const sid = editingSheetId?.trim();
  if (!sid || !forThread) return undefined;
  if (forThread.routeSheetId?.trim() === sid) return forThread;
  return undefined;
}
