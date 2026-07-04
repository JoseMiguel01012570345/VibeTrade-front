import { apiFetch } from "@shared/services/http/apiClient";
import { apiErrorTextToUserMessage } from "@shared/services/http/apiErrorMessage";
import type {
  SupplierPortalDashboard,
  SupplierPortalInventoryBulkUpdateItem,
  SupplierPortalInventoryBulkUpdateResult,
  SupplierPortalLoginResult,
  SupplierPortalMe,
} from "../Dtos/supplierPortalTypes";
import { getSupplierId } from "../logic/supplierPortalSession";

async function throwFromResponse(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  throw new Error(apiErrorTextToUserMessage(text));
}

function supplierHeaders(): HeadersInit {
  const supplierId = getSupplierId();
  return supplierId ? { "X-Supplier-Id": supplierId } : {};
}

function readApiNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function readApiString(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw == null) return "";
  return String(raw);
}

function normalizeTransactionRow(raw: unknown) {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const kindRaw = readApiString(o.kind ?? o.Kind).trim().toLowerCase();
  const kind =
    kindRaw === "platformdebt" || kindRaw === "platform_debt" ? "platformDebt" : "order";
  return {
    kind: kind as "order" | "platformDebt",
    orderId: readApiString(o.orderId ?? o.OrderId) || null,
    adjustmentId: readApiString(o.adjustmentId ?? o.AdjustmentId) || null,
    publicNumber: readApiString(o.publicNumber ?? o.PublicNumber),
    createdAt: readApiString(o.createdAt ?? o.CreatedAt),
    customerName: readApiString(o.customerName ?? o.CustomerName),
    itemCount: readApiNumber(o.itemCount ?? o.ItemCount) ?? 0,
    total: readApiNumber(o.total ?? o.Total ?? o.amount ?? o.Amount) ?? 0,
    currencyCode: readApiString(o.currencyCode ?? o.CurrencyCode),
    status: readApiNumber(o.status ?? o.Status) ?? 0,
    platformDebtAmountAfter:
      readApiNumber(o.platformDebtAmountAfter ?? o.PlatformDebtAmountAfter) ?? null,
  };
}

function normalizeInventoryRow(raw: unknown) {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const categoryIdsRaw = o.categoryIds ?? o.CategoryIds;
  const categoryIds = Array.isArray(categoryIdsRaw)
    ? categoryIdsRaw.map((id) => readApiString(id)).filter(Boolean)
    : [];
  return {
    id: readApiString(o.id ?? o.Id),
    name: readApiString(o.name ?? o.Name),
    skuLabel: readApiString(o.skuLabel ?? o.SkuLabel),
    photoUrl: readApiString(o.photoUrl ?? o.PhotoUrl) || null,
    categoryName: readApiString(o.categoryName ?? o.CategoryName),
    categoryId: readApiString(o.categoryId ?? o.CategoryId),
    subcategoryId: readApiString(o.subcategoryId ?? o.SubcategoryId),
    categoryIds,
    description: readApiString(o.description ?? o.Description),
    price: readApiNumber(o.price ?? o.Price) ?? 0,
    currencyCode: readApiString(o.currencyCode ?? o.CurrencyCode),
    stock: readApiNumber(o.stock ?? o.Stock) ?? 0,
    pendingApproval: Boolean(o.pendingApproval ?? o.PendingApproval),
    isAvailable: Boolean(o.isAvailable ?? o.IsAvailable),
  };
}

function normalizeDashboard(raw: unknown): SupplierPortalDashboard {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const kpisRaw = (o.kpis ?? o.Kpis ?? {}) as Record<string, unknown>;
  const txRaw = (o.transactions ?? o.Transactions ?? {}) as Record<string, unknown>;
  const invRaw = (o.inventory ?? o.Inventory ?? {}) as Record<string, unknown>;
  const txItemsRaw = txRaw.items ?? txRaw.Items;
  const txItems = Array.isArray(txItemsRaw)
    ? txItemsRaw.map((row) => normalizeTransactionRow(row))
    : [];
  const invItemsRaw = invRaw.items ?? invRaw.Items;
  const invItems = Array.isArray(invItemsRaw)
    ? invItemsRaw.map((row) => normalizeInventoryRow(row))
    : [];
  const invCategoriesRaw = invRaw.categories ?? invRaw.Categories;
  const invCategories = Array.isArray(invCategoriesRaw)
    ? invCategoriesRaw.map((row) => {
        const c = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
        return {
          id: readApiString(c.id ?? c.Id),
          name: readApiString(c.name ?? c.Name),
        };
      })
    : [];
  return {
    kpis: {
      fondosBanderaExpress:
        readApiNumber(kpisRaw.fondosBanderaExpress ?? kpisRaw.FondosBanderaExpress) ?? 0,
      listoParaRetiro:
        readApiNumber(kpisRaw.listoParaRetiro ?? kpisRaw.ListoParaRetiro) ?? 0,
      volumenVenta: readApiNumber(kpisRaw.volumenVenta ?? kpisRaw.VolumenVenta) ?? 0,
      currencyCode: readApiString(kpisRaw.currencyCode ?? kpisRaw.CurrencyCode),
    },
    transactions: {
      items: txItems,
      total: readApiNumber(txRaw.total ?? txRaw.Total) ?? 0,
      page: readApiNumber(txRaw.page ?? txRaw.Page) ?? 1,
      pageSize: readApiNumber(txRaw.pageSize ?? txRaw.PageSize) ?? 15,
    },
    inventory: {
      items: invItems,
      categories: invCategories,
    },
  };
}

export function formatSupplierPortalError(e: unknown): string {
  if (e instanceof Error) return apiErrorTextToUserMessage(e.message);
  return apiErrorTextToUserMessage(String(e));
}

export async function supplierPortalLogin(
  username: string,
  password: string,
): Promise<SupplierPortalLoginResult> {
  const res = await apiFetch("/api/v1/supplier-portal/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) await throwFromResponse(res);
  const data = (await res.json()) as Record<string, unknown>;
  const supplierId = readApiString(data.supplierId ?? data.SupplierId);
  const token = readApiString(data.token ?? data.Token);
  if (!supplierId) throw new Error("Respuesta de login inválida.");
  return { supplierId, token: token || supplierId };
}

export async function fetchSupplierPortalMe(): Promise<SupplierPortalMe> {
  const res = await apiFetch("/api/v1/supplier-portal/me", {
    headers: supplierHeaders(),
  });
  if (!res.ok) await throwFromResponse(res);
  const data = (await res.json()) as Record<string, unknown>;
  return {
    businessName: readApiString(data.businessName ?? data.BusinessName),
    portalUsername: readApiString(data.portalUsername ?? data.PortalUsername),
  };
}

export async function fetchSupplierPortalDashboard(params?: {
  transactionsPage?: number;
  transactionsPageSize?: number;
  from?: string;
  to?: string;
  status?: number;
  invalidated?: boolean;
  includeLiquidated?: boolean;
  transactionsSort?: "asc" | "desc";
}): Promise<SupplierPortalDashboard> {
  const qs = new URLSearchParams();
  if (params?.transactionsPage != null) {
    qs.set("transactionsPage", String(params.transactionsPage));
  }
  if (params?.transactionsPageSize != null) {
    qs.set("transactionsPageSize", String(params.transactionsPageSize));
  }
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.status != null) qs.set("status", String(params.status));
  if (params?.invalidated != null) qs.set("invalidated", String(params.invalidated));
  if (params?.includeLiquidated != null) {
    qs.set("includeLiquidated", String(params.includeLiquidated));
  }
  if (params?.transactionsSort) qs.set("transactionsSort", params.transactionsSort);

  const suffix = qs.toString();
  const res = await apiFetch(
    `/api/v1/supplier-portal/dashboard${suffix ? `?${suffix}` : ""}`,
    { headers: supplierHeaders() },
  );
  if (!res.ok) await throwFromResponse(res);
  return normalizeDashboard(await res.json());
}

export async function bulkUpdateSupplierPortalInventory(
  items: SupplierPortalInventoryBulkUpdateItem[],
): Promise<SupplierPortalInventoryBulkUpdateResult> {
  const res = await apiFetch("/api/v1/supplier-portal/inventory/bulk-update", {
    method: "POST",
    headers: supplierHeaders(),
    body: JSON.stringify({
      items: items.map((item) => ({ id: item.id, stock: item.stock })),
    }),
  });
  if (!res.ok) await throwFromResponse(res);
  const data = (await res.json()) as Record<string, unknown>;
  const errorsRaw = data.errors ?? data.Errors;
  const errors = Array.isArray(errorsRaw)
    ? errorsRaw.map((row) => {
        const e = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
        return {
          id: readApiString(e.id ?? e.Id),
          message: readApiString(e.message ?? e.Message),
        };
      })
    : [];
  return {
    updatedCount: readApiNumber(data.updatedCount ?? data.UpdatedCount) ?? 0,
    errors,
  };
}
