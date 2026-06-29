import type {
  ChatDeliveryStatus,
  Message,
} from "@features/market/logic/store/marketStoreTypes";

export function hhmm(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Mensaje propio con estado de entrega persistido (texto, imagen, audio, documentos, acuerdo). */
export function deliveryStateForMineMessage(
  m: Message,
): ChatDeliveryStatus | undefined {
  if (m.from !== "me") return undefined;
  switch (m.type) {
    case "text":
    case "image":
    case "audio":
    case "doc":
    case "docs":
    case "agreement":
      break;
    default:
      return undefined;
  }
  if ("chatStatus" in m && m.chatStatus) return m.chatStatus;
  if ("read" in m && m.read === true) return "read";
  if ("read" in m && m.read === false) return "sent";
  return "sent";
}
