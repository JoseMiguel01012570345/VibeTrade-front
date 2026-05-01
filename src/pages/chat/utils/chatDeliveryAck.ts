import type { Message } from "../../../app/store/marketStoreTypes";

/** Misma familia de tipos que el ping de entregado vía `messageCreated` (chatRealtime). */
export function incomingMessageSupportsDeliveryAck(m: Message): boolean {
  if (m.from !== "other" || !m.id || m.id.startsWith("pend_")) return false;
  if (m.type === "text" && "offerQaId" in m && !!m.offerQaId) return false;
  if (m.chatStatus === "delivered" || m.chatStatus === "read") return false;
  return (
    m.type === "text" ||
    m.type === "image" ||
    m.type === "audio" ||
    m.type === "doc" ||
    m.type === "docs" ||
    m.type === "agreement"
  );
}
