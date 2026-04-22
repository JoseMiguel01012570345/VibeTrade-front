import type {
  ServiceItem,
  TradeAgreement,
} from '../../pages/chat/domain/tradeAgreementTypes'
import { normalizeMerchandiseLine } from '../../pages/chat/domain/tradeAgreementTypes'
import type { TradeAgreementApiDto } from './chatApi'

export function mapTradeAgreementApiToTradeAgreement(
  d: TradeAgreementApiDto,
): TradeAgreement {
  const merchandise = (d.merchandise ?? []).map((x) =>
    normalizeMerchandiseLine(x as object),
  )
  const services = (d.services ?? []) as ServiceItem[]
  return {
    id: d.id,
    threadId: d.threadId,
    title: d.title,
    issuedAt: d.issuedAt,
    issuedByStoreId: d.issuedByStoreId,
    issuerLabel: d.issuerLabel,
    status: d.status,
    respondedAt: d.respondedAt ?? undefined,
    sellerEditBlockedUntilBuyerResponse:
      d.sellerEditBlockedUntilBuyerResponse ?? undefined,
    includeMerchandise: d.includeMerchandise,
    includeService: d.includeService,
    merchandise,
    services: services.length ? services : undefined,
    merchandiseMeta: d.merchandiseMeta
      ? (d.merchandiseMeta as TradeAgreement['merchandiseMeta'])
      : undefined,
    routeSheetId: d.routeSheetId ?? undefined,
    routeSheetUrl: d.routeSheetUrl ?? undefined,
  }
}
