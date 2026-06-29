import toast from "react-hot-toast";
import { Download } from "lucide-react";
import { useMarketStore } from "@features/market/model/store/useMarketStore";
import { cn } from "@shared/lib/cn";
import {
  agreementDeclaresMerchandise,
  agreementDeclaresService,
  legacyCombinedExtraFields,
  merchandiseScopedExtraFields,
  type TradeAgreement,
} from "@features/chat/model/tradeAgreementTypes";
import type { RouteSheet } from "@features/chat/model/routeSheetTypes";
import { AgreementMerchandiseEvidenceSection } from "./AgreementMerchandiseEvidenceSection";
import { downloadTradeAgreementPdf } from "@features/chat/model/tradeAgreementPdfDownload";
import {
  agrDetailBlock,
  agrDetailH,
  agrDetailHint,
  agrDetailRoot,
} from '../../model/formModalStyles';
import {
  AgreementDetailRow,
  ExtraFieldClauseCards,
  legacyMerchandiseMetaHasContent,
  MerchandiseBlock,
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
  const m = a.merchandiseMeta ?? undefined;
  const catalog = useMarketStore((s) => s.storeCatalogs[a.issuedByStoreId]);
  const showMerch = agreementDeclaresMerchandise(a);
  const showService = agreementDeclaresService(a);
  const {
    servicePays,
    servicePaysBusy,
    evidenceModal,
    setEvidenceModal,
    sellerPayoutModal,
    setSellerPayoutModal,
    refreshServicePays,
    lastMsg,
  } = useAgreementDetailServicePayments(threadId, a.id);

  const linkedSheet = a.routeSheetId
    ? routeSheets.find((r) => r.id === a.routeSheetId)
    : undefined;

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
          <AgreementDetailRow label="Título" value={a.title} />
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

      {showMerch ? (
        <MerchandiseBlock lines={a.merchandise} catalog={catalog} />
      ) : null}

      {showMerch ? (
        <AgreementMerchandiseEvidenceSection
          threadId={threadId}
          agreementId={a.id}
          isActingSeller={isActingSeller}
          routeSheetId={a.routeSheetId}
          routeSheetEstado={linkedSheet?.estado}
          lastSystemMessageId={
            lastMsg?.from === "system" ? lastMsg.id : undefined
          }
          lastSystemMessageText={
            lastMsg?.from === "system" && lastMsg.type === "text"
              ? lastMsg.text
              : undefined
          }
        />
      ) : null}

      {showMerch && merchandiseScopedExtraFields(a.extraFields).length ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>Otras cláusulas (mercancía)</div>
          <ExtraFieldClauseCards
            fields={merchandiseScopedExtraFields(a.extraFields)}
          />
        </div>
      ) : null}

      {showMerch && legacyMerchandiseMetaHasContent(m) ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>
            Mercancías · condiciones generales (acuerdo anterior)
          </div>
          <p className={cn("vt-muted", agrDetailHint, "mb-2")}>
            Estos datos eran comunes a todo el bloque; en acuerdos nuevos van por
            cada ítem.
          </p>
          <AgreementDetailRow label="Moneda" value={m!.moneda} />
          <AgreementDetailRow label="Tipo de embalaje" value={m!.tipoEmbalaje} />
          <AgreementDetailRow
            label="Condiciones para devolver y garantias"
            value={m!.devolucionesDesc}
          />
          <AgreementDetailRow
            label="Quién paga envío de devolución"
            value={m!.devolucionQuienPaga}
          />
          <AgreementDetailRow label="Plazos (devolución)" value={m!.devolucionPlazos} />
          <AgreementDetailRow
            label="Regulaciones, aduanas, restricciones, permisos"
            value={m!.regulaciones}
          />
        </div>
      ) : null}

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
            Campos adicionales conjuntos (histórico)
          </div>
          <p className={cn("vt-muted", agrDetailHint, "mb-2 text-[13px]")}>
            Pactados cuando el bloque mercancía y el de servicios compartían una
            sola lista de cláusulas extra.
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
