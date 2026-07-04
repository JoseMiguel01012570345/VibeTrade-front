import toast from "react-hot-toast";
import { Download } from "lucide-react";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { cn } from "@shared/lib/cn";
import type { TradeAgreement } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import { agreementDeclaresService, legacyCombinedExtraFields } from "@features/chat/logic/agreement/tradeAgreementTypes";
import type { RouteSheet } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import { downloadTradeAgreementPdf } from "@features/chat/logic/agreement/tradeAgreementPdfDownload";
import {
  agrDetailBlock,
  agrDetailH,
  agrDetailHint,
  agrDetailRoot,
} from '@shared/styles/modals/formModalStyles';
import {
  AgreementDetailRow,
  ExtraFieldClauseCards,
} from "./agreementDetailPresentation";
import { AgreementDetailRouteSection } from "./AgreementDetailRouteSection";
import { AgreementDetailServicesSection } from "./AgreementDetailServicesSection";
import { AgreementServiceEvidenceModal } from "./AgreementServiceEvidenceModal";
import { AgreementSellerPayoutModal } from "./AgreementSellerPayoutModal";
import { useAgreementDetailServicePayments } from "@features/chat/hooks/useAgreementDetailServicePayments";

export function AgreementDetailView({
  a,
  threadId,
  isActingSeller = false,
  onOpenRouteSheet,
  routeSheets = [],
  routeSheetIdsLinkedElsewhere,
  onLinkRouteSheet,
  onUnlinkRouteSheet,
  linkActionsDisabled = false,
  routeLinkFrozenAfterPayment = false,
}: {
  a: TradeAgreement;
  threadId: string;
  isActingSeller?: boolean;
  onOpenRouteSheet?: (routeSheetId: string) => void;
  routeSheets?: RouteSheet[];
  routeSheetIdsLinkedElsewhere?: ReadonlySet<string>;
  onLinkRouteSheet?: (agreementId: string, routeSheetId: string) => void;
  onUnlinkRouteSheet?: (agreementId: string) => void;
  linkActionsDisabled?: boolean;
  routeLinkFrozenAfterPayment?: boolean;
}) {
  const catalog = useMarketStore((s) => s.storeCatalogs[a.issuedByStoreId]);
  const showService = agreementDeclaresService(a);
  const {
    servicePays,
    servicePaysBusy,
    evidenceModal,
    setEvidenceModal,
    sellerPayoutModal,
    setSellerPayoutModal,
    refreshServicePays,
  } = useAgreementDetailServicePayments(threadId, a.id);

  const evidenceModalSellerCanEdit =
    evidenceModal !== null &&
    isActingSeller &&
    evidenceModal.pay.status !== "released" &&
    (evidenceModal.pay.evidence?.status ?? "").trim().toLowerCase() !==
      "accepted";

  return (
    <div className={agrDetailRoot}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <AgreementDetailRow label="T�tulo" value={a.title} />
        </div>
        <button
          type="button"
          className={cn(
            "vt-btn vt-btn-sm inline-flex shrink-0 items-center gap-1.5",
          )}
          onClick={() => {
            void (async () => {
              try {
                await downloadTradeAgreementPdf(a, catalog);
                toast.success("PDF generado.");
              } catch {
                toast.error("No se pudo generar el PDF.");
              }
            })();
          }}
        >
          <Download size={14} aria-hidden />
          Descargar PDF
        </button>
      </div>

      <AgreementDetailRouteSection
        agreement={a}
        routeSheets={routeSheets}
        routeSheetIdsLinkedElsewhere={routeSheetIdsLinkedElsewhere}
        onOpenRouteSheet={onOpenRouteSheet}
        onLinkRouteSheet={onLinkRouteSheet}
        onUnlinkRouteSheet={onUnlinkRouteSheet}
        linkActionsDisabled={linkActionsDisabled}
        routeLinkFrozenAfterPayment={routeLinkFrozenAfterPayment}
      />

      {showService ? (
        <AgreementDetailServicesSection
          agreement={a}
          threadId={threadId}
          isActingSeller={isActingSeller}
          catalog={catalog}
          servicePays={servicePays}
          servicePaysBusy={servicePaysBusy}
          setEvidenceModal={setEvidenceModal}
          setSellerPayoutModal={setSellerPayoutModal}
          refreshServicePays={refreshServicePays}
        />
      ) : null}

      {legacyCombinedExtraFields(a.extraFields).length ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>
            Campos adicionales conjuntos (hist�rico)
          </div>
          <p className={cn("vt-muted", agrDetailHint, "mb-2 text-[13px]")}>
            Pactados cuando el bloque mercanc�a y el de servicios compart�an una
            sola lista de cl�usulas extra.
          </p>
          <ExtraFieldClauseCards
            fields={legacyCombinedExtraFields(a.extraFields)}
          />
        </div>
      ) : null}

      {evidenceModal ? (
        <AgreementServiceEvidenceModal
          threadId={threadId}
          agreementId={a.id}
          modal={evidenceModal}
          sellerCanEdit={evidenceModalSellerCanEdit}
          onClose={() => setEvidenceModal(null)}
          onUpdate={setEvidenceModal}
          onRefresh={refreshServicePays}
        />
      ) : null}

      {sellerPayoutModal ? (
        <AgreementSellerPayoutModal
          threadId={threadId}
          agreementId={a.id}
          modal={sellerPayoutModal}
          onClose={() => setSellerPayoutModal(null)}
          onUpdate={setSellerPayoutModal}
          onRefresh={refreshServicePays}
        />
      ) : null}
    </div>
  );
}
