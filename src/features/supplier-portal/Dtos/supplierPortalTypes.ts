export type SupplierPortalMe = {
  businessName: string;
  portalUsername: string;
};

export type SupplierPortalDashboardKpis = {
  fondosBanderaExpress: number;
  listoParaRetiro: number;
  volumenVenta: number;
  currencyCode: string;
};

export type SupplierPortalTransactionRow = {
  kind: "order" | "platformDebt";
  orderId: string | null;
  adjustmentId: string | null;
  publicNumber: string;
  createdAt: string;
  customerName: string;
  itemCount: number;
  total: number;
  currencyCode: string;
  status: number;
  platformDebtAmountAfter: number | null;
};

export type SupplierPortalInventoryRow = {
  id: string;
  name: string;
  skuLabel: string;
  photoUrl: string | null;
  categoryName: string;
  categoryId: string;
  subcategoryId: string;
  categoryIds: string[];
  description: string;
  price: number;
  currencyCode: string;
  stock: number;
  pendingApproval: boolean;
  isAvailable: boolean;
};

export type SupplierPortalCategoryOption = {
  id: string;
  name: string;
};

export type SupplierPortalDashboard = {
  kpis: SupplierPortalDashboardKpis;
  transactions: {
    items: SupplierPortalTransactionRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  inventory: {
    items: SupplierPortalInventoryRow[];
    categories: SupplierPortalCategoryOption[];
  };
};

export type SupplierPortalInventoryBulkUpdateItem = {
  id: string;
  stock: number;
};

export type SupplierPortalInventoryBulkUpdateRowError = {
  id: string;
  message: string;
};

export type SupplierPortalInventoryBulkUpdateResult = {
  updatedCount: number;
  errors: SupplierPortalInventoryBulkUpdateRowError[];
};

export type AppliedOrderFilters = {
  from: string;
  to: string;
  status: string;
  invalidatedFilter: string;
};

export type OrderDateDirection = "asc" | "desc";

export type SummaryCardAccent = "green" | "gray";

export type SupplierPortalLoginResult = {
  supplierId: string;
  token: string;
};
