import { useMarketStore } from "../../app/store/useMarketStore";
import { fetchChatThreads } from "./chatApi";
import { getSessionToken } from "../http/sessionToken";
import { rehydrateCthThreadInStoreForIncomingMessage } from "./rehydrateCthThreadInStoreForIncomingMessage";

/**
 * GET `/api/v1/chat/threads` incluye hilos donde el usuario es transportista con tramo confirmado;
 * incorpora al store los que aún no estaban (p. ej. tras aceptación sin recargar la app).
 */
export async function mergeMissingChatListThreadsFromServer(): Promise<void> {
  if (!getSessionToken()) return;
  let summaries: Awaited<ReturnType<typeof fetchChatThreads>>;
  try {
    summaries = await fetchChatThreads();
  } catch {
    return;
  }
  for (const summ of summaries) {
    const id = summ.id?.trim() ?? "";
    if (!id.startsWith("cth_")) continue;
    if (useMarketStore.getState().threads[id]) continue;
    await rehydrateCthThreadInStoreForIncomingMessage(id);
  }
}
