export interface WarehouseDebtDto {
  id: string;
  storeId: string;
  orderId: string;
  orderPublicNumber: string;
  amount: number;
  currencyCode: string;
  liquidated: boolean;
  deleted: boolean;
  createdAtUtc: string;
}

export interface AffiliateDebtDto {
  id: string;
  affiliateId: string | null;
  affiliateCode: string;
  orderId: string;
  orderPublicNumber: string;
  amount: number;
  currencyCode: string;
  liquidated: boolean;
  deleted: boolean;
  createdAtUtc: string;
}

export interface CarrierDebtDto {
  id: string;
  carrierUserId: string;
  orderId: string;
  orderPublicNumber: string;
  routeSheetId: string;
  routeStopId: string;
  totalKm: number;
  ratePerKm: number;
  amount: number;
  currencyCode: string;
  liquidated: boolean;
  deleted: boolean;
  createdAtUtc: string;
}

export interface DebtCurrencyTotalDto {
  currencyCode: string;
  amount: number;
}

export interface DebtsOverviewDto {
  warehouse: WarehouseDebtDto[];
  affiliate: AffiliateDebtDto[];
  carrier: CarrierDebtDto[];
  pendingTotals: DebtCurrencyTotalDto[];
  liquidatedTotals: DebtCurrencyTotalDto[];
}

export interface LiquidateDebtsRequest {
  warehouseDebtIds?: string[];
  affiliateDebtIds?: string[];
}

export interface LiquidateDebtsResponse {
  liquidatedWarehouse: number;
  liquidatedAffiliate: number;
}

export interface AffiliateCommissionTotalDto {
  currencyCode: string;
  amount: number;
}

export interface AffiliateDashboardDto {
  affiliateId: string;
  code: string;
  displayName: string;
  commissionKind: string;
  commissionValue: number;
  commissionCurrencyCode: string | null;
  visits: number;
  salesCount: number;
  commissionTotals: AffiliateCommissionTotalDto[];
}
