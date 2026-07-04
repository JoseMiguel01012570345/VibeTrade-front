import type {
  MarketState,
  RouteOfferPublicState,
  RouteOfferTramoAssignment,
  RouteOfferTramoPublic,
  Thread,
} from "@features/market/logic/store/marketStoreTypes";
import { threadHasAcceptedAgreement } from "@features/market/logic/store/marketStoreTypes";
import type { RouteSheet, RouteSheetCreatePayload, RouteStop } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import { routeSheetEstadoIsEntregada } from "./routeSheetTypes";
import type { RouteTramoSubscriptionItemApi } from "@features/chat/Dtos/thread/chatApiTypes";
import type { RouteStopDeliveryStatusApi } from "@features/chat/Dtos/route-sheet/routeLogisticsApiTypes";
import { routeOfferPublicFromThreadRouteSheet } from "@features/market/logic/routeOfferPublicFromEmergentCard";

/** Mensaje cuando la tienda intenta expulsar con tramo activo sin pausa previa. */
export const SELLER_EXPEL_REQUIRES_PAUSE_ES =
  "Pausá el tramo (custodia tienda) antes de expulsar al transportista mientras tiene la carga en curso.";

/** Mensaje cuando el comprador del hilo intenta suscribirse como transportista a la misma hoja publicada. */
export const ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES =
  "No puedes suscribirte como transportista: en esta operación eres el comprador con un acuerdo aceptado.";

/** Mensaje cuando la hoja ya fue entregada y no puede republicarse. */
export const ROUTE_SHEET_PUBLISH_BLOCKED_DELIVERED_ES =
  "Esta hoja de ruta ya fue entregada; no se puede publicar en la plataforma.";

/** Mensaje cuando el tramo ya fue entregado y no admite nuevas suscripciones. */
export const ROUTE_TRAMO_SUBSCRIBE_BLOCKED_DELIVERED_ES =
  "Este tramo ya fue entregado; no se aceptan nuevas suscripciones.";

/** Hoja vinculada a acuerdo con cobros registrados (bloqueo local + API). */
export const ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES =
  "Esta hoja está vinculada a un acuerdo con cobros registrados; no se puede editar ni eliminar.";

/** Con cobros registrados: solo se permite cambiar contacto de transportista en tramos sin confirmación. */
export const ROUTE_SHEET_PAID_CARRIER_CONTACT_ONLY_ES =
  "Hay cobros registrados: podés actualizar solo el contacto de transportista en tramos sin asignación confirmada.";

/** Tramos de la hoja sin transportista confirmado (p. ej. tras expulsión). */
export function routeSheetVacantStopIds(
  offer: RouteOfferPublicState | undefined,
  sheetId: string,
): Set<string> {
  const vacant = new Set<string>();
  if (offer?.routeSheetId !== sheetId) return vacant;
  for (const t of offer.tramos ?? []) {
    const sid = t.stopId?.trim();
    if (!sid) continue;
    if (t.assignment?.status === "confirmed") continue;
    vacant.add(sid);
  }
  return vacant;
}

function confirmedStopIdsFromSubscriptions(
  sheetId: string,
  items: RouteTramoSubscriptionItemApi[] | undefined,
): Set<string> {
  const confirmed = new Set<string>();
  const sid = sheetId.trim();
  if (!sid || !items?.length) return confirmed;
  for (const it of items) {
    if (it.routeSheetId?.trim() !== sid) continue;
    if ((it.status ?? "").trim().toLowerCase() !== "confirmed") continue;
    const stopId = it.stopId?.trim();
    if (stopId) confirmed.add(stopId);
  }
  return confirmed;
}

/**
 * Tramos vacantes para edición de contacto con cobros registrados.
 * En hilos con varias hojas, la oferta del hilo puede apuntar a otra hoja: se usan paradas + suscripciones.
 */
export function routeSheetVacantStopIdsForPaidEdit(
  sheet: RouteSheet | undefined,
  offer: RouteOfferPublicState | undefined,
  sheetId: string,
  subscriptions?: RouteTramoSubscriptionItemApi[],
): Set<string> {
  const sid = sheetId.trim();
  if (!sid) return new Set();

  if (offer?.routeSheetId?.trim() === sid) {
    const fromOffer = routeSheetVacantStopIds(offer, sid);
    if (fromOffer.size > 0 || !subscriptions?.length) return fromOffer;
  }

  const paradas = sheet?.paradas ?? [];
  if (!paradas.length) {
    return offer?.routeSheetId?.trim() === sid
      ? routeSheetVacantStopIds(offer, sid)
      : new Set();
  }

  const confirmed = confirmedStopIdsFromSubscriptions(sid, subscriptions);
  if (offer?.routeSheetId?.trim() === sid) {
    for (const t of offer.tramos ?? []) {
      if (t.assignment?.status === "confirmed") {
        const stopId = t.stopId?.trim();
        if (stopId) confirmed.add(stopId);
      }
    }
  }

  const vacant = new Set<string>();
  for (const p of paradas) {
    const pid = p.id?.trim();
    if (!pid) continue;
    if (!confirmed.has(pid)) vacant.add(pid);
  }
  return vacant;
}

export function routeSheetAllowsCarrierContactEditWhenPaid(
  sheetLockedByPaid: boolean,
  offer: RouteOfferPublicState | undefined,
  sheetId: string,
  sheet?: RouteSheet,
  subscriptions?: RouteTramoSubscriptionItemApi[],
): boolean {
  return (
    sheetLockedByPaid &&
    routeSheetVacantStopIdsForPaidEdit(sheet, offer, sheetId, subscriptions)
      .size > 0
  );
}

export function routeSheetStructuralEditBlockedByPaid(
  sheetLockedByPaid: boolean,
  offer: RouteOfferPublicState | undefined,
  sheetId: string,
  sheet?: RouteSheet,
  subscriptions?: RouteTramoSubscriptionItemApi[],
): boolean {
  return (
    sheetLockedByPaid &&
    !routeSheetAllowsCarrierContactEditWhenPaid(
      sheetLockedByPaid,
      offer,
      sheetId,
      sheet,
      subscriptions,
    )
  );
}

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

import type { RouteSheetPreselectedInvite } from "@features/chat/Dtos/route-sheet/routeSheetOfferGuardsTypes";

/**
 * Tramos a enviar en `notify-preselected` tras guardar: cambió el teléfono respecto a la hoja previa
 * o se añadió/cambió una invitación por ficha de servicio (sin retirar la ficha). Así un mismo número en otro
 * tramo dispara aviso aunque el teléfono ya figuraba igual en el formulario.
 * Usa `resolveRouteStopIdForFormRow` como el resto del flujo de oferta/hoja.
 */
export function preselInvitesForTramoPhoneEdits(
  initial: RouteSheet | null | undefined,
  paradasFinal: RouteSheetCreatePayload["paradas"],
): RouteSheetPreselectedInvite[] {
  const invites: RouteSheetPreselectedInvite[] = [];
  const initialStops = initial?.paradas ?? [];
  for (let i = 0; i < paradasFinal.length; i++) {
    const p = paradasFinal[i]!;
    const nu = p.telefonoTransportista?.trim() ?? "";
    if (!nu) continue;
    const stopId =
      resolveRouteStopIdForFormRow(
        p.paradaId,
        initialStops.length > 0 ? initialStops[i] : undefined,
      )?.trim() ?? "";
    const oldStop = initialStops.find((x) => (x.id ?? "").trim() === stopId);
    const ou = oldStop?.telefonoTransportista?.trim() ?? "";
    const phoneChanged = normRoutePhoneKey(ou) !== normRoutePhoneKey(nu);
    if (!phoneChanged) continue;
    invites.push({ stopId, phone: nu });
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
  sheetParadaAtIndex: { id?: string } | undefined,
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
 * True si el hilo debe mostrar el panel logístico (Rutas + Integrantes): hay al menos un
 * transportista con tramo confirmado en la oferta pública o en integrantes del chat.
 */
export function threadShowsRouteSheets(
  state: Pick<MarketState, "threads" | "routeOfferPublic" | "offers">,
  thread: Thread,
): boolean {
  if ((thread.chatCarriers?.length ?? 0) > 0) return true;
  for (const ro of Object.values(state.routeOfferPublic)) {
    if (ro.threadId !== thread.id) continue;
    if (
      ro.tramos?.some((t) => t.assignment?.status === "confirmed") ?? false
    ) {
      return true;
    }
  }
  const ro = resolveRouteOfferPublicForThread(state, thread);
  return (
    ro?.tramos?.some((t) => t.assignment?.status === "confirmed") ?? false
  );
}

/** Transportista con tramo confirmado en la oferta pública del hilo o listado en integrantes del chat. */
export function viewerIsConfirmedRouteCarrierOnThread(
  state: Pick<MarketState, "threads" | "routeOfferPublic" | "offers">,
  thread: Thread,
  viewerUserId: string,
): boolean {
  const uid = viewerUserId.trim();
  if (uid.length < 2) return false;
  if (thread.chatCarriers?.some((c) => (c.id ?? "").trim() === uid))
    return true;
  const ro = resolveRouteOfferPublicForThread(state, thread);
  if (!ro?.tramos?.length) return false;
  return ro.tramos.some(
    (t) =>
      (t.assignment?.status ?? "").trim().toLowerCase() === "confirmed" &&
      (t.assignment?.userId ?? "").trim() === uid,
  );
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
  const sheet = thread.routeSheets?.find((r) => r.id === rsid);
  if (sheet?.paradas?.length) {
    return routeOfferPublicFromThreadRouteSheet(thread.id, sheet);
  }
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

export function routeSheetPublishBlockedWhenDelivered(
  estado: RouteSheet["estado"] | string | undefined,
): boolean {
  return routeSheetEstadoIsEntregada(estado);
}

/** Tramo liquidado con evidencia aceptada (entregado). */
export function routeStopTramoDeliveredByEvidence(
  delivery: Pick<RouteStopDeliveryStatusApi, "state"> | undefined,
): boolean {
  return (delivery?.state ?? "").trim().toLowerCase() === "evidence_accepted";
}

export function routeStopTramoSubscribeBlocked(
  deliveries: RouteStopDeliveryStatusApi[],
  routeSheetId: string,
  stopId: string,
): boolean {
  return routeStopTramoDeliveredByEvidence(
    findRouteStopDelivery(deliveries, routeSheetId, stopId),
  );
}

/** Señales locales en la hoja (demo) cuando aún no hay filas de entrega cargadas. */
export function routeStopTramoSubscribeBlockedOnSheet(
  sheet: RouteSheet | undefined,
  stopId: string,
): boolean {
  if (!sheet) return false;
  if (routeSheetPublishBlockedWhenDelivered(sheet.estado)) return true;
  const parada = sheet.paradas.find((p) => p.id === stopId);
  return parada?.completada === true;
}

type DeliveryExpelInput = Pick<
  RouteStopDeliveryStatusApi,
  "state" | "currentOwnerUserId"
>;

/** True si el transportista es titular y el tramo no está pausado ni cerrado logísticamente. */
export function carrierDeliveryBlocksSellerExpel(
  delivery: DeliveryExpelInput | undefined,
  carrierUserId: string,
): boolean {
  const carrierId = carrierUserId.trim();
  if (carrierId.length < 2) return false;

  const state = (delivery?.state ?? "").trim().toLowerCase();
  if (!state) return false;

  if (
    state === "evidence_rejected" ||
    state === "delivered_pending_evidence" ||
    state === "evidence_submitted"
  ) {
    return true;
  }
  if (
    state === "evidence_accepted" ||
    state === "idle_store_custody" ||
    state === "refunded"
  ) {
    return false;
  }

  if ((delivery?.currentOwnerUserId ?? "").trim() !== carrierId) return false;
  return true;
}

export function findRouteStopDelivery(
  deliveries: RouteStopDeliveryStatusApi[],
  routeSheetId: string,
  stopId: string,
): RouteStopDeliveryStatusApi | undefined {
  const rsid = routeSheetId.trim();
  const sid = stopId.trim();
  if (!rsid || !sid) return undefined;
  return deliveries.find(
    (d) =>
      (d.routeSheetId ?? "").trim() === rsid &&
      (d.routeStopId ?? "").trim() === sid,
  );
}

export function sellerExpelBlockedForStop(
  deliveries: RouteStopDeliveryStatusApi[],
  routeSheetId: string,
  stopId: string,
  carrierUserId: string,
): boolean {
  return carrierDeliveryBlocksSellerExpel(
    findRouteStopDelivery(deliveries, routeSheetId, stopId),
    carrierUserId,
  );
}

export function sellerExpelBlockedForCarrier(
  deliveries: RouteStopDeliveryStatusApi[],
  confirmedTramos: { routeSheetId: string; stopId: string }[],
  carrierUserId: string,
): boolean {
  return confirmedTramos.some((t) =>
    sellerExpelBlockedForStop(
      deliveries,
      t.routeSheetId,
      t.stopId,
      carrierUserId,
    ),
  );
}
