import type {
  ServiceItem,
  TradeAgreement,
  TradeAgreementExtraFieldDraft,
  TradeAgreementExtraFieldScope,
  TradeAgreementExtraValueKind,
} from "../../pages/chat/domain/tradeAgreementTypes";
import {
  normalizeExtraScope,
  normalizeMerchandiseLine,
} from "../../pages/chat/domain/tradeAgreementTypes";
import type {
  TradeAgreementApiDto,
  TradeAgreementExtraFieldApiDto,
} from "./chatApi";

function mapExtraFieldDtoFromApi(
  x: TradeAgreementExtraFieldApiDto,
  fallbackScope?: TradeAgreementExtraFieldScope,
): TradeAgreementExtraFieldDraft {
  const kind: TradeAgreementExtraValueKind =
    x.valueKind === "image" || x.valueKind === "document"
      ? x.valueKind
      : "text";
  const scope = normalizeExtraScope(
    (x.scope ?? fallbackScope) as string | undefined,
  );
  return {
    id:
      typeof x.id === "string" && x.id.trim()
        ? x.id
        : `xfe-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    scope,
    title: typeof x.title === "string" ? x.title : "",
    valueKind: kind,
    textValue: x.textValue != null ? String(x.textValue) : "",
    mediaUrl: x.mediaUrl != null ? String(x.mediaUrl) : "",
    fileName: x.fileName != null ? String(x.fileName) : "",
  };
}

function mapExtraFieldDto(
  x: TradeAgreementExtraFieldApiDto,
): TradeAgreementExtraFieldDraft {
  return mapExtraFieldDtoFromApi(x);
}

function mapServiceDtoToServiceItem(raw: Record<string, unknown>): ServiceItem {
  const base = { ...(raw as object) } as ServiceItem;
  const ce = raw.condicionesExtras;
  if (!Array.isArray(ce) || ce.length === 0) return base;
  return {
    ...base,
    condicionesExtras: ce.map((row) =>
      mapExtraFieldDtoFromApi(row as TradeAgreementExtraFieldApiDto, "service"),
    ),
  };
}

export function mapTradeAgreementApiToTradeAgreement(
  d: TradeAgreementApiDto,
): TradeAgreement {
  const merchandise = (d.merchandise ?? []).map((x) =>
    normalizeMerchandiseLine(x as object),
  );
  const services = (d.services ?? []).map((row) =>
    mapServiceDtoToServiceItem(row as Record<string, unknown>),
  );
  const extraFields: TradeAgreementExtraFieldDraft[] | undefined =
    d.extraFields && d.extraFields.length
      ? d.extraFields.map(mapExtraFieldDto)
      : undefined;
  return {
    id: d.id,
    threadId: d.threadId,
    title: d.title,
    issuedAt: d.issuedAt,
    issuedByStoreId: d.issuedByStoreId,
    issuerLabel: d.issuerLabel,
    status: d.status,
    deletedAt: d.deletedAt != null ? d.deletedAt : undefined,
    respondedAt: d.respondedAt ?? undefined,
    sellerEditBlockedUntilBuyerResponse:
      d.sellerEditBlockedUntilBuyerResponse ?? undefined,
    hadBuyerAcceptance: d.hadBuyerAcceptance === true ? true : undefined,
    includeMerchandise: d.includeMerchandise,
    includeService: d.includeService,
    merchandise,
    services: services.length ? services : undefined,
    merchandiseMeta: d.merchandiseMeta
      ? (d.merchandiseMeta as TradeAgreement["merchandiseMeta"])
      : undefined,
    extraFields,
    routeSheetId: d.routeSheetId ?? undefined,
    routeSheetUrl: d.routeSheetUrl ?? undefined,
    hasSucceededPayments: d.hasSucceededPayments === true ? true : undefined,
  };
}
