import { useEffect, useMemo, useState } from "react";
import { FileText, Route, Users } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import type { StoreBadge, ThreadChatCarrier } from "../../../../app/store/useMarketStore";
import { useMarketStore } from "../../../../app/store/useMarketStore";
import { cn } from "../../../../lib/cn";
import type { TradeAgreement } from "../../domain/tradeAgreementTypes";
import type { RouteSheet } from "../../domain/routeSheetTypes";
import { resolveRouteOfferPublicForThread } from "../../domain/routeSheetOfferGuards";
import { buildChatParticipants } from "../../lib/chatParticipants";
import {
  RAIL_BODY,
  RAIL_ROOT,
  TAB_BASE,
  TAB_ON,
  type ContractFilter,
} from "./chatRailStyles";
import { ChatRightRailContractsPanel } from "./ChatRightRailContractsPanel";
import { ChatRightRailPeoplePanel } from "./ChatRightRailPeoplePanel";
import { ChatRightRailRoutesPanel } from "./ChatRightRailRoutesPanel";

export type { ContractFilter } from "./chatRailStyles";

type Props = {
  threadId: string;
  threadStoreId: string;
  contracts: TradeAgreement[];
  routeSheets: RouteSheet[];
  contractsLoading?: boolean;
  routeSheetsLoading?: boolean;
  actionsLocked?: boolean;
  storeName: string;
  buyerName: string;
  buyer: { id: string; name: string; trustScore: number; avatarUrl?: string };
  seller: StoreBadge;
  focusRouteId?: string | null;
  onConsumedRouteFocus?: () => void;
  onOpenNewRouteSheet: () => void;
  onEditRouteSheet: (sheet: RouteSheet) => void;
  toggleRouteStop: (
    threadId: string,
    routeSheetId: string,
    stopId: string,
  ) => void;
  onRequestEditAgreement?: (agreement: TradeAgreement) => void;
  isActingSeller?: boolean;
  onDeleteAgreement?: (agreement: TradeAgreement) => void;
  chatCarriers?: ThreadChatCarrier[];
  onOpenRouteSubscribers?: (routeSheetId: string) => void;
  /** Tras mutaciones de ruta en hilo persistido: hojas + suscripciones desde API. */
  onPersistedRouteDataRefresh?: () => Promise<void>;
};

export function ChatRightRail({
  threadId,
  threadStoreId,
  contracts,
  routeSheets,
  contractsLoading = false,
  routeSheetsLoading = false,
  actionsLocked = false,
  storeName,
  buyerName,
  focusRouteId,
  buyer,
  seller,
  onConsumedRouteFocus,
  onOpenNewRouteSheet,
  onEditRouteSheet,
  toggleRouteStop,
  onRequestEditAgreement,
  isActingSeller = false,
  onDeleteAgreement,
  chatCarriers,
  onOpenRouteSubscribers,
  onPersistedRouteDataRefresh,
}: Props) {
  const publishRouteSheetsToPlatform = useMarketStore(
    (s) => s.publishRouteSheetsToPlatform,
  );
  const unpublishRouteSheetFromPlatform = useMarketStore(
    (s) => s.unpublishRouteSheetFromPlatform,
  );
  const linkAgreementToRouteSheet = useMarketStore(
    (s) => s.linkAgreementToRouteSheet,
  );
  const unlinkAgreementFromRouteSheet = useMarketStore(
    (s) => s.unlinkAgreementFromRouteSheet,
  );
  const deleteRouteSheet = useMarketStore((s) => s.deleteRouteSheet);
  const routeOfferForThread = useMarketStore(
    useShallow((s) => {
      const th = s.threads[threadId];
      return resolveRouteOfferPublicForThread(s, th);
    }),
  );
  const [tab, setTab] = useState<"contracts" | "routes" | "people">("contracts");
  const [cFilter, setCFilter] = useState<ContractFilter>("all");
  const [selContract, setSelContract] = useState<TradeAgreement | null>(null);
  const [selRouteId, setSelRouteId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusRouteId) return;
    setTab("routes");
    setSelRouteId(focusRouteId);
    onConsumedRouteFocus?.();
  }, [focusRouteId, onConsumedRouteFocus]);

  const participants = useMemo(
    () => buildChatParticipants(buyer, seller, chatCarriers),
    [buyer, seller, chatCarriers],
  );

  const linkedRouteSheetIds = useMemo(() => {
    const s = new Set<string>();
    for (const c of contracts) {
      if (c.status === "deleted") continue;
      if (c.routeSheetId) s.add(c.routeSheetId);
    }
    return s;
  }, [contracts]);

  const displayContracts = useMemo(() => {
    if (cFilter === "all") return contracts;
    if (cFilter === "store")
      return contracts.filter((c) => c.issuedByStoreId === threadStoreId);
    return contracts.filter(
      (c) =>
        c.status === "pending_buyer" ||
        c.respondedAt != null ||
        c.status === "deleted",
    );
  }, [contracts, cFilter, threadStoreId]);

  const selRoute = selRouteId
    ? routeSheets.find((r) => r.id === selRouteId)
    : undefined;
  const agreementForDetail = selContract
    ? (contracts.find((c) => c.id === selContract.id) ?? selContract)
    : null;

  function openRouteFromContract(rid: string) {
    setTab("routes");
    setSelRouteId(rid);
    setSelContract(null);
  }

  return (
    <aside className={RAIL_ROOT} aria-label="Contratos, rutas e integrantes del chat">
      <div className="flex shrink-0 border-b border-[var(--border)]">
        <button
          type="button"
          className={cn(TAB_BASE, tab === "contracts" && TAB_ON)}
          onClick={() => {
            setTab("contracts");
            setSelRouteId(null);
          }}
        >
          <FileText size={15} aria-hidden /> Contratos
        </button>
        <button
          type="button"
          className={cn(TAB_BASE, tab === "routes" && TAB_ON)}
          onClick={() => {
            setTab("routes");
            setSelContract(null);
          }}
        >
          <Route size={15} aria-hidden /> Rutas
        </button>
        <button
          type="button"
          className={cn(TAB_BASE, tab === "people" && TAB_ON)}
          onClick={() => {
            setTab("people");
            setSelContract(null);
            setSelRouteId(null);
          }}
        >
          <Users size={15} aria-hidden /> Integrantes ({participants.length})
        </button>
      </div>

      {tab === "contracts" && (
        <ChatRightRailContractsPanel
          bodyClassName={RAIL_BODY}
          cFilter={cFilter}
          setCFilter={setCFilter}
          storeName={storeName}
          buyerName={buyerName}
          selContract={selContract}
          setSelContract={setSelContract}
          agreementForDetail={agreementForDetail}
          displayContracts={displayContracts}
          contractsLoading={contractsLoading}
          routeSheets={routeSheets}
          actionsLocked={actionsLocked}
          threadId={threadId}
          threadStoreId={threadStoreId}
          linkAgreementToRouteSheet={linkAgreementToRouteSheet}
          unlinkAgreementFromRouteSheet={unlinkAgreementFromRouteSheet}
          openRouteFromContract={openRouteFromContract}
          onRequestEditAgreement={onRequestEditAgreement}
          isActingSeller={isActingSeller}
          onDeleteAgreement={onDeleteAgreement}
        />
      )}

      {tab === "routes" && (
        <ChatRightRailRoutesPanel
          bodyClassName={RAIL_BODY}
          actionsLocked={actionsLocked}
          isActingSeller={isActingSeller}
          hasAcceptedContract={contracts.some((c) => c.status === "accepted")}
          agreementCount={contracts.length}
          routeSheetsLoading={routeSheetsLoading}
          routeSheets={routeSheets}
          linkedRouteSheetIds={linkedRouteSheetIds}
          selRoute={selRoute}
          setSelRouteId={setSelRouteId}
          threadId={threadId}
          onOpenNewRouteSheet={onOpenNewRouteSheet}
          onEditRouteSheet={onEditRouteSheet}
          toggleRouteStop={toggleRouteStop}
          deleteRouteSheet={deleteRouteSheet}
          publishRouteSheetsToPlatform={publishRouteSheetsToPlatform}
          unpublishRouteSheetFromPlatform={unpublishRouteSheetFromPlatform}
          routeOffer={routeOfferForThread}
          onOpenRouteSubscribers={onOpenRouteSubscribers}
          onPersistedRouteDataRefresh={onPersistedRouteDataRefresh}
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
