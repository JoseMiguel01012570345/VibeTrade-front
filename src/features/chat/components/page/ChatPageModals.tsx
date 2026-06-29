import type { RouteOfferPublicState } from '@features/market/logic/store/marketStoreTypes'
import type { TradeAgreement } from '@features/chat/Dtos/agreement/tradeAgreementTypes';import type { RouteSheet } from '@features/chat/Dtos/route-sheet/routeSheetTypes';import type { RouteSheetFormPayload, RouteSheetSubmitResult } from '@features/chat/Dtos/route-sheet/routeSheetFormModalTypes';import type { StoreCatalog } from '@features/market/logic/storeCatalogTypes'
import type { TradeAgreementDraft } from '@features/chat/Dtos/agreement/tradeAgreementTypes';import { ImageLightbox } from '@shared/components/media/ImageLightbox'
import { AgreementDeleteRouteSheetsModal } from '../modals/AgreementDeleteRouteSheetsModal'
import { ChatPaymentModal } from '../ChatPayment/ChatPaymentModal'
import { TrustRiskEditConfirmModal } from '../modals/TrustRiskEditConfirmModal'
import { TradeAgreementFormModal } from '../modals/TradeAgreementFormModal'
import { RouteSheetFormModal } from '../modals/RouteSheetFormModal'
import { PeerPartyExitedInfoModal } from '../modals/PeerPartyExitedInfoModal'
import { CarrierTelemetryBridge } from '../logistics/CarrierTelemetryBridge'
import { ChatRouteSubscribersPanel } from '../ChatRouteSubscribersPanel'

type CarrierTarget = {
  agreementId: string
  routeSheetId: string
  routeStopId: string
}

type Props = {
  thread: {
    id: string
    offerId: string
    store: { name: string }
    contracts?: Array<{
      id: string
      status: string
      routeSheetId?: string
      title: string
      hasSucceededPayments?: boolean
    }>
    routeSheets?: RouteSheet[]
  }
  lightboxUrl: string | null
  onCloseLightbox: () => void
  agreementDeleteSheetsModal: null | { agreementId: string; title: string }
  onCloseAgreementDeleteSheets: () => void
  chatPayOpen: boolean
  showBuyerPaymentInChat: boolean
  acceptedAgreementsForPayment: TradeAgreement[]
  onCloseChatPay: () => void
  onPaymentFullySettled: () => void
  carrierTelemetryTargets: CarrierTarget[]
  pendingRouteSheetTrustConfirm: RouteSheet | null
  onCloseRouteSheetTrustConfirm: () => void
  onConfirmRouteSheetTrust: () => void
  showAgreementForm: boolean
  isActingSeller: boolean
  sellerCatalog: StoreCatalog | null
  agreementBeingEditedId: string | null
  agreementFormInitial: TradeAgreementDraft | null
  onCloseAgreementForm: () => void
  onSubmitAgreement: (draft: TradeAgreementDraft) => Promise<boolean>
  showRouteSheetForm: boolean
  routeSheetBeingEdited: RouteSheet | null
  routeSheetLockedByPaidAgreement: boolean
  routeSheetCarrierContactEditOnly: boolean
  routeOfferForEditingRouteSheet: RouteOfferPublicState | undefined
  routeOfferForThisThread: RouteOfferPublicState | undefined
  routeLegPaymentCurrency: string | null | undefined
  onCloseRouteSheetForm: () => void
  onSubmitRouteSheet: (payload: RouteSheetFormPayload) => RouteSheetSubmitResult
  peerPartyExitedInfo: { roleLabel: string; reason: string } | null
  onAckPeerPartyExited: () => void
  routeSubscribersSheetId: string | null
  subsSheetWideLayout: boolean
  viewerIsThreadSeller: boolean
  acceptedAgreementIdsForSubscribers: string[]
  highlightSubscriberUserId: string | null
  refreshChatRouteData: () => void | Promise<void>
  syncThreadRouteSheetsFromSubscribersPanel: (sheets: RouteSheet[]) => void
  onCloseSubscriberRouteSheet: () => void
}

export function ChatPageModals({
  thread,
  lightboxUrl,
  onCloseLightbox,
  agreementDeleteSheetsModal,
  onCloseAgreementDeleteSheets,
  chatPayOpen,
  showBuyerPaymentInChat,
  acceptedAgreementsForPayment,
  onCloseChatPay,
  onPaymentFullySettled,
  carrierTelemetryTargets,
  pendingRouteSheetTrustConfirm,
  onCloseRouteSheetTrustConfirm,
  onConfirmRouteSheetTrust,
  showAgreementForm,
  isActingSeller,
  sellerCatalog,
  agreementBeingEditedId,
  agreementFormInitial,
  onCloseAgreementForm,
  onSubmitAgreement,
  showRouteSheetForm,
  routeSheetBeingEdited,
  routeSheetLockedByPaidAgreement,
  routeSheetCarrierContactEditOnly,
  routeOfferForEditingRouteSheet,
  routeOfferForThisThread,
  routeLegPaymentCurrency,
  onCloseRouteSheetForm,
  onSubmitRouteSheet,
  peerPartyExitedInfo,
  onAckPeerPartyExited,
  routeSubscribersSheetId,
  subsSheetWideLayout,
  viewerIsThreadSeller,
  acceptedAgreementIdsForSubscribers,
  highlightSubscriberUserId,
  refreshChatRouteData,
  syncThreadRouteSheetsFromSubscribersPanel,
  onCloseSubscriberRouteSheet,
}: Props) {
  return (
    <>
      {routeSubscribersSheetId && !subsSheetWideLayout ? (
        <div
          className="fixed inset-0 z-[110] min-[961px]:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vt-chat-subs-sheet-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(2,6,23,0.52)] backdrop-blur-[3px]"
            aria-label="Cerrar suscriptores a la ruta"
            onClick={onCloseSubscriberRouteSheet}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,820px)] min-h-[40dvh] w-full flex-col pb-[env(safe-area-inset-bottom,0px)] pt-0">
            <div className="pointer-events-auto flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none rounded-t-[1.125rem] border-x-0 border-b-0 border-t border-[var(--border)] bg-[var(--surface)] shadow-[0_-12px_40px_rgba(2,6,23,0.28)]">
              <div id="vt-chat-subs-sheet-title" className="sr-only">
                Suscriptores a la hoja de ruta
              </div>
              <ChatRouteSubscribersPanel
                embedded
                key={`${thread.id}-route-subscribers-mob`}
                threadId={thread.id}
                routeOffer={routeOfferForThisThread}
                contextRouteSheetId={routeSubscribersSheetId}
                routeSheets={(thread.routeSheets ?? []).map((r) => ({
                  id: r.id,
                  titulo: (r.titulo ?? 'Hoja de ruta').trim() || 'Hoja de ruta',
                }))}
                canSellerManageRouteSubscriptions={viewerIsThreadSeller}
                acceptedAgreementIds={acceptedAgreementIdsForSubscribers}
                onSubscriptionsChanged={refreshChatRouteData}
                highlightUserId={highlightSubscriberUserId}
                onThreadRouteSheetsSynced={
                  syncThreadRouteSheetsFromSubscribersPanel
                }
                onClose={onCloseSubscriberRouteSheet}
              />
            </div>
          </div>
        </div>
      ) : null}

      <ImageLightbox url={lightboxUrl} onClose={onCloseLightbox} />

      <AgreementDeleteRouteSheetsModal
        open={agreementDeleteSheetsModal !== null}
        threadId={thread.id}
        agreementId={agreementDeleteSheetsModal?.agreementId ?? ''}
        agreementTitle={agreementDeleteSheetsModal?.title ?? ''}
        onClose={onCloseAgreementDeleteSheets}
        onAgreementDeleted={onCloseAgreementDeleteSheets}
      />

      <ChatPaymentModal
        open={chatPayOpen && showBuyerPaymentInChat}
        threadId={thread.id}
        agreements={acceptedAgreementsForPayment}
        routeSheets={thread.routeSheets ?? []}
        onClose={onCloseChatPay}
        onPaymentFullySettled={onPaymentFullySettled}
      />

      {carrierTelemetryTargets.map((t) => (
        <CarrierTelemetryBridge
          key={`${t.agreementId}:${t.routeStopId}`}
          enabled
          threadId={thread.id}
          agreementId={t.agreementId}
          routeSheetId={t.routeSheetId}
          routeStopId={t.routeStopId}
        />
      ))}

      <TrustRiskEditConfirmModal
        open={pendingRouteSheetTrustConfirm !== null}
        onClose={onCloseRouteSheetTrustConfirm}
        onConfirm={onConfirmRouteSheetTrust}
      />

      <TradeAgreementFormModal
        open={showAgreementForm && isActingSeller}
        onClose={onCloseAgreementForm}
        storeName={thread.store.name}
        sellerCatalog={sellerCatalog}
        contextOfferId={thread.offerId}
        initialDraft={agreementBeingEditedId ? agreementFormInitial : null}
        editingAgreementId={agreementBeingEditedId}
        onSubmit={onSubmitAgreement}
      />

      <RouteSheetFormModal
        open={showRouteSheetForm && isActingSeller}
        threadId={thread.id}
        initialRouteSheet={routeSheetBeingEdited}
        lockedByPaidAgreement={routeSheetLockedByPaidAgreement}
        carrierContactEditOnly={routeSheetCarrierContactEditOnly}
        routeOfferForSheet={routeOfferForEditingRouteSheet}
        routeOfferForThread={routeOfferForThisThread}
        routeLegPaymentCurrency={routeLegPaymentCurrency}
        onClose={onCloseRouteSheetForm}
        onSubmit={onSubmitRouteSheet}
      />

      <PeerPartyExitedInfoModal
        open={peerPartyExitedInfo != null}
        roleLabel={peerPartyExitedInfo?.roleLabel ?? ''}
        reason={peerPartyExitedInfo?.reason ?? ''}
        onAcknowledge={onAckPeerPartyExited}
      />
    </>
  )
}
