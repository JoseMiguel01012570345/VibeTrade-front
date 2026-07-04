const SUPPLIER_ID_KEY = "vt-supplier-portal-id";

export function getSupplierId(): string | null {
  try {
    return sessionStorage.getItem(SUPPLIER_ID_KEY);
  } catch {
    return null;
  }
}

export function setSupplierId(id: string): void {
  sessionStorage.setItem(SUPPLIER_ID_KEY, id);
}

export function clearSupplierId(): void {
  sessionStorage.removeItem(SUPPLIER_ID_KEY);
}
