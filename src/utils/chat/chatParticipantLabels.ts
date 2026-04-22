import type { ChatMessageDto } from "./chatApi";
import type { Message, Thread } from "../../app/store/marketStoreTypes";

/** Vendedor del hilo (API o dueño de tienda en demo). */
export function resolveSellerUserId(th: Thread): string | undefined {
  return th.sellerUserId ?? th.store.ownerUserId ?? undefined;
}

/**
 * Comprador del hilo (API o demo). Si falta `buyerUserId` en el cliente pero el chat es 1:1 e
 * iniciaste como comprador (`viewerUserId` ≠ vendedor), inferimos el id del comprador.
 */
export function resolveBuyerUserId(
  th: Thread,
  viewerUserId?: string,
): string | undefined {
  const sellerUid = resolveSellerUserId(th);
  let b = th.buyerUserId ?? th.demoBuyer?.id;
  if (b && sellerUid && b === sellerUid) b = undefined;
  if (b) return b;
  if (
    viewerUserId &&
    sellerUid &&
    viewerUserId !== sellerUid &&
    viewerUserId !== "guest"
  )
    return viewerUserId;
  return undefined;
}

function nameLooksLikeStore(
  storeName: string,
  candidate: string | undefined,
): boolean {
  if (!candidate?.trim()) return false;
  return candidate.trim().toLowerCase() === storeName.trim().toLowerCase();
}

/** El mensaje lo envía la tienda (no el comprador). */
export function inferMessageFromSeller(
  m: Message,
  th: Thread,
  viewerUserId: string,
): boolean {
  const sellerUid = resolveSellerUserId(th);
  const imSeller = sellerUid != null && viewerUserId === sellerUid;
  if (m.from === "me") return imSeller;
  if (m.from === "other") return !imSeller;
  return false;
}

/** Nombre corto del comprador para el sufijo tras "Comprador .". */
export function buyerFirstNameForThread(
  th: Thread,
  viewerUserId: string,
  viewerName: string,
  profileDisplayNames: Record<string, string>,
): string {
  const storeLabel = (th.store.name || "Negocio").trim();
  const buyerUid = resolveBuyerUserId(th, viewerUserId);
  if (buyerUid === viewerUserId) return viewerName.trim() || "Comprador";

  const fromProfile = buyerUid
    ? profileDisplayNames[buyerUid]?.trim()
    : undefined;
  if (fromProfile && !nameLooksLikeStore(storeLabel, fromProfile))
    return fromProfile;

  const fromDemo = th.demoBuyer?.name?.trim();
  if (fromDemo && !nameLooksLikeStore(storeLabel, fromDemo)) return fromDemo;

  return "Comprador";
}

/**
 * Etiqueta visible en burbujas y toasts: nombre del negocio o `Comprador . &lt;nombre&gt;`.
 */
export function formatChatParticipantDisplayName(args: {
  messageFromSeller: boolean;
  storeName: string;
  buyerFirstName: string;
}): string {
  if (args.messageFromSeller) return (args.storeName || "Negocio").trim();
  const raw = (args.buyerFirstName || "").trim();
  if (!raw || raw === "Comprador") return "Comprador";
  return `Comprador \u00b7 ${raw}`;
}

/**
 * Título del hilo (lista / barra del chat): el comprador ve la tienda; el vendedor
 * <code>«nombre de la tienda» · «nombre del comprador»</code> (U+00B7).
 */
export function chatThreadHeaderTitle(
  th: Thread,
  me: { id: string; name: string },
  profileDisplayNames: Record<string, string>,
): string {
  const storeName = (th.store.name || "Negocio").trim();
  const sellerUid = resolveSellerUserId(th);
  const imSeller = sellerUid != null && me.id === sellerUid;
  if (!imSeller) return storeName;
  const buyerName = buyerFirstNameForThread(
    th,
    me.id,
    me.name,
    profileDisplayNames,
  );
  return `${storeName} \u00b7 ${buyerName}`;
}

/** Encabezado de burbuja para un mensaje (vos / el otro). */
export function chatBubbleHeaderLabel(
  mine: boolean,
  th: Thread,
  me: { id: string; name: string },
  profileDisplayNames: Record<string, string>,
): string {
  const sellerUid = resolveSellerUserId(th);
  const imSeller = sellerUid != null && me.id === sellerUid;
  const messageFromSeller = mine ? imSeller : !imSeller;
  return formatChatParticipantDisplayName({
    messageFromSeller,
    storeName: th.store.name,
    buyerFirstName: buyerFirstNameForThread(
      th,
      me.id,
      me.name,
      profileDisplayNames,
    ),
  });
}

/** Autor para citas en el composer (Tú vs etiqueta formateada del otro). */
export function replySelectionAuthorLabel(
  msg: Message,
  th: Thread,
  me: { id: string; name: string },
  profileDisplayNames: Record<string, string>,
): string {
  if (msg.from === "me") return "Tú";
  if (msg.from === "system") return "Sistema";
  const fromSeller = inferMessageFromSeller(msg, th, me.id);
  return formatChatParticipantDisplayName({
    messageFromSeller: fromSeller,
    storeName: th.store.name,
    buyerFirstName: buyerFirstNameForThread(
      th,
      me.id,
      me.name,
      profileDisplayNames,
    ),
  });
}

/** Autor en citas / replyQuotes al enviar (compacto: Tú o etiqueta del otro). */
export function quoteAuthorForMessage(
  m: Message,
  th: Thread,
  viewerId: string,
  viewerName: string,
  profileDisplayNames: Record<string, string>,
): string {
  if (m.from === "system") return "Sistema";
  if (m.from === "me") return "Tú";
  const fromSeller = inferMessageFromSeller(m, th, viewerId);
  return formatChatParticipantDisplayName({
    messageFromSeller: fromSeller,
    storeName: th.store.name,
    buyerFirstName: buyerFirstNameForThread(
      th,
      viewerId,
      viewerName,
      profileDisplayNames,
    ),
  });
}

/** Remitente de un mensaje entrante (toast / notificación en tiempo real). */
export function incomingDtoSenderDisplayLabel(
  dto: ChatMessageDto,
  th: Thread,
  viewerId: string,
  viewerName: string,
  profileDisplayNames: Record<string, string>,
): string {
  const sellerUid = resolveSellerUserId(th);
  const messageFromSeller = sellerUid != null && dto.senderUserId === sellerUid;
  if (messageFromSeller) {
    return formatChatParticipantDisplayName({
      messageFromSeller: true,
      storeName: th.store.name,
      buyerFirstName: "",
    });
  }
  const storeLabel = (th.store.name || "Negocio").trim();
  const buyerUid = resolveBuyerUserId(th, viewerId);
  const serverLabel = dto.senderDisplayLabel?.trim();

  let name = "";
  if (serverLabel && !nameLooksLikeStore(storeLabel, serverLabel)) {
    name = serverLabel;
  }
  if (!name) {
    if (dto.senderUserId === viewerId) {
      name = viewerName.trim() || "Comprador";
    } else {
      name = profileDisplayNames[dto.senderUserId]?.trim() ?? "";
      if (nameLooksLikeStore(storeLabel, name)) name = "";
      if (!name && buyerUid === dto.senderUserId) {
        name = th.demoBuyer?.name?.trim() ?? "";
        if (nameLooksLikeStore(storeLabel, name)) name = "";
      }
      if (!name) name = "Comprador";
    }
  }

  return formatChatParticipantDisplayName({
    messageFromSeller: false,
    storeName: th.store.name,
    buyerFirstName: name,
  });
}
