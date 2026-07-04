import { useEffect, useMemo, useState } from "react";
import { Route, Users } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import type {
  StoreBadge,
  ThreadChatCarrier,
} from "@features/market/logic/store/useMarketStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { cn } from "@shared/lib/cn";
import type { TradeAgreement } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import type { RouteSheet } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import { resolveRouteOfferPublicForThread } from "@features/chat/logic/route-sheet/routeSheetOfferGuards";
import { buildChatParticipants } from '@features/chat/logic/participants/chatParticipants';
import {
  RAIL_BODY,
  RAIL_ROOT,
  TAB_BASE,
  TAB_ON,
} from "./chatRailStyles";
import { ChatRightRailPeoplePanel } from "./ChatRightRailPeoplePanel";
import { ChatRightRailRoutesPanel } from "../routes/ChatRightRailRoutesPanel";

type Props = {
  threadId: string;
  /** IDs de comprador/vendedor del hilo (API); mejoran permisos UX en logística. */
  buyerUserId?: string;
  sellerUserId?: string;
  contracts: TradeAgreement[];
  routeSheets: RouteSheet[];
  routeSheetsLoading?: boolean;
  actionsLocked?: boolean;
  buyer: { id: string; name: string; trustScore: number; avatarUrl?: string };
  seller: StoreBadge;
  focusRouteId?: string | null;
  onConsumedRouteFocus?: () => void;
  onEditRouteSheet: (sheet: RouteSheet) => void;
  toggleRouteStop: (
    threadId: string,
    routeSheetId: string,
    stopId: string,
  ) => void;
  isActingSeller?: boolean;
  chatCarriers?: ThreadChatCarrier[];
  onOpenRouteSubscribers?: (routeSheetId: string) => void;
  /** Tras mutaciones de ruta en hilo persistido: hojas + suscripciones desde API. */
  onPersistedRouteDataRefresh?: () => Promise<void>;
  /** Comprador/vendedor que ya salió del hilo no debe figurar en integrantes. */
  excludeBuyerFromParticipants?: boolean;
  excludeSellerFromParticipants?: boolean;
};

export function ChatRightRail({
  threadId,
  buyerUserId,
  sellerUserId,
  contracts,
  routeSheets,
  routeSheetsLoading = false,
  actionsLocked = false,
  focusRouteId,
  buyer,
  seller,
  onConsumedRouteFocus,
  onEditRouteSheet,
  toggleRouteStop,
  isActingSeller = false,
  chatCarriers,
  onOpenRouteSubscribers,
  onPersistedRouteDataRefresh,
  excludeBuyerFromParticipants = false,
  excludeSellerFromParticipants = false,
}: Props) {
  const publishRouteSheetsToPlatform = useMarketStore(
    (s) => s.publishRouteSheetsToPlatform,
  );
  const unpublishRouteSheetFromPlatform = useMarketStore(
    (s) => s.unpublishRouteSheetFromPlatform,
  );
  const deleteRouteSheet = useMarketStore((s) => s.deleteRouteSheet);
  const duplicateRouteSheet = useMarketStore((s) => s.duplicateRouteSheet);
  const routeOfferForThread = useMarketStore(
    useShallow((s) => {
      const th = s.threads[threadId];
      return resolveRouteOfferPublicForThread(s, th);
    }),
  );
  const [tab, setTab] = useState<"routes" | "people">("routes");
  const [selRouteId, setSelRouteId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusRouteId) return;
    setTab("routes");
    setSelRouteId(focusRouteId);
    onConsumedRouteFocus?.();
  }, [focusRouteId, onConsumedRouteFocus]);

  const participants = useMemo(
    () =>
      buildChatParticipants(buyer, seller, chatCarriers, {
        excludeBuyer: excludeBuyerFromParticipants,
        excludeSeller: excludeSellerFromParticipants,
      }),
    [
      buyer,
      seller,
      chatCarriers,
      excludeBuyerFromParticipants,
      excludeSellerFromParticipants,
    ],
  );

  const linkedRouteSheetIds = useMemo(() => {
    const s = new Set<string>();
    for (const c of contracts) {
      if (c.status === "deleted") continue;
      if (c.routeSheetId) s.add(c.routeSheetId);
    }
    return s;
  }, [contracts]);

  const selRoute = selRouteId
    ? routeSheets.find((r) => r.id === selRouteId)
    : undefined;

  return (
    <aside
      className={RAIL_ROOT}
      aria-label="Rutas e integrantes del chat"
    >
      <div className="flex shrink-0 border-b border-[var(--border)]">
        <button
          type="button"
          className={cn(TAB_BASE, tab === "routes" && TAB_ON)}
          onClick={() => setTab("routes")}
        >
          <Route size={15} aria-hidden /> Rutas
        </button>
        <button
          type="button"
          className={cn(TAB_BASE, tab === "people" && TAB_ON)}
          onClick={() => {
            setTab("people");
            setSelRouteId(null);
          }}
        >
          <Users size={15} aria-hidden /> Integrantes ({participants.length})
        </button>
      </div>

      {tab === "routes" && (
        <ChatRightRailRoutesPanel
          bodyClassName={RAIL_BODY}
          buyerUserId={buyerUserId}
          sellerUserId={sellerUserId}
          agreements={contracts}
          isActingSeller={isActingSeller}
          routeSheetsLoading={routeSheetsLoading}
          routeSheets={routeSheets}
          linkedRouteSheetIds={linkedRouteSheetIds}
          selRoute={selRoute}
          setSelRouteId={setSelRouteId}
          threadId={threadId}
          onEditRouteSheet={onEditRouteSheet}
          toggleRouteStop={toggleRouteStop}
          deleteRouteSheet={deleteRouteSheet}
          duplicateRouteSheet={duplicateRouteSheet}
          publishRouteSheetsToPlatform={publishRouteSheetsToPlatform}
          unpublishRouteSheetFromPlatform={unpublishRouteSheetFromPlatform}
          routeOffer={routeOfferForThread}
          onOpenRouteSubscribers={onOpenRouteSubscribers}
          onPersistedRouteDataRefresh={onPersistedRouteDataRefresh}
          actionsLocked={actionsLocked}
        />
      )}

      {tab === "people" && (
        <ChatRightRailPeoplePanel
          bodyClassName={RAIL_BODY}
          participants={participants}
        />
      )}
    </aside>
  );
}
