import { apiFetch } from "@shared/services/http/apiClient";
import type {
  StoreBannerDto,
  StoreCategoryDto,
  StoreSupplierDto,
} from "../Dtos/storeCatalogTypes";

export async function fetchStoreCategories(
  storeId: string,
): Promise<StoreCategoryDto[]> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/categories`,
  );
  if (!res.ok) return [];
  return (await res.json()) as StoreCategoryDto[];
}

export async function fetchStoreSuppliers(
  storeId: string,
): Promise<StoreSupplierDto[]> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/suppliers`,
  );
  if (!res.ok) return [];
  return (await res.json()) as StoreSupplierDto[];
}

export async function approveStoreProduct(
  storeId: string,
  productId: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}/approve`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("No se pudo aprobar el producto.");
}

export async function removeStoreProductFromCatalog(
  storeId: string,
  productId: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}/remove-from-catalog`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("No se pudo quitar el producto del catálogo.");
}

export async function fetchStoreBannersAdmin(
  storeId: string,
): Promise<StoreBannerDto[]> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/banners`,
  );
  if (!res.ok) return [];
  return (await res.json()) as StoreBannerDto[];
}

export async function fetchStoreBannersPublic(
  storeId: string,
  kind: "main" | "secondary",
): Promise<StoreBannerDto[]> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/catalog/banners?type=${kind}`,
  );
  if (!res.ok) return [];
  return (await res.json()) as StoreBannerDto[];
}

export async function createStoreBanner(
  storeId: string,
  body: { kind: string; mediaUrl: string; sortOrder?: number },
): Promise<StoreBannerDto> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/banners`,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error("No se pudo crear el banner.");
  return (await res.json()) as StoreBannerDto;
}

export async function deleteStoreBanner(
  storeId: string,
  bannerId: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/banners/${encodeURIComponent(bannerId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("No se pudo eliminar el banner.");
}

export async function createStoreSupplier(
  storeId: string,
  body: { businessName: string; portalUsername: string; password: string },
): Promise<StoreSupplierDto> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/suppliers`,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error("No se pudo crear el proveedor.");
  return (await res.json()) as StoreSupplierDto;
}
