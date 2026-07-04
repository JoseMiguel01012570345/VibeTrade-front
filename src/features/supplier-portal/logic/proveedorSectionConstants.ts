import type { AppliedOrderFilters } from "../Dtos/supplierPortalTypes";

export const PROVEEDOR_TABLE_LIST_SHELL =
  "rounded-xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-black/[0.04] dark:border-gray-700 dark:bg-gray-900 dark:ring-white/[0.06]";

export const EMPTY_ORDER_FILTERS: AppliedOrderFilters = {
  from: "",
  to: "",
  status: "",
  invalidatedFilter: "",
};

export const PROVEEDOR_PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;

export const DEFAULT_ADMIN_PAGE_SIZE = 15;

export const ORDER_STATUS_LABELS = ["Recoger", "En mensajería", "Entregado"] as const;
