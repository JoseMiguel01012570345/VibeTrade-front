import { fetchStoreDetail } from "@features/market/api/fetchStoreDetail";
import { parseProductPriceNumber } from "@features/market/logic/parseProductPrice";
import { catalogMonedasList } from "@features/market/logic/storeCatalogTypes";
import type { CartItem } from "./cartStore";

/**
 * Compartir carrito por enlace (réplica de la app de referencia, frontend-guest
 * `lib/shareCart.ts`). El carrito de VibeTrade es de una sola tienda, así que el
 * parámetro codifica también el `storeId` para poder resolver los productos desde
 * su catálogo al importar: `"<storeId>|productId:qty,productId:qty"` (los GUID no
 * contienen `|` ni `:`).
 */

export type SharedCartItem = {
  productId: string;
  quantity: number;
};

export type DecodedShareCart = {
  storeId: string;
  items: SharedCartItem[];
};

export function encodeShareCartParam(
  storeId: string,
  items: SharedCartItem[],
): string {
  const sid = storeId.trim();
  const body = items
    .filter((i) => i.productId && i.quantity > 0)
    .map((i) => `${i.productId.trim()}:${Math.floor(i.quantity)}`)
    .join(",");
  if (!sid || !body) return "";
  return `${sid}|${body}`;
}

export function decodeShareCartParam(
  raw: string | null | undefined,
): DecodedShareCart {
  const empty: DecodedShareCart = { storeId: "", items: [] };
  const value = raw?.trim() ?? "";
  if (!value) return empty;

  const bar = value.indexOf("|");
  if (bar <= 0) return empty;
  const storeId = value.slice(0, bar).trim();

  const merged = new Map<string, number>();
  for (const part of value.slice(bar + 1).split(",")) {
    const segment = part.trim();
    if (!segment) continue;
    const sep = segment.indexOf(":");
    if (sep <= 0) continue;
    const productId = segment.slice(0, sep).trim();
    const qty = Math.floor(Number(segment.slice(sep + 1)));
    if (!productId || !Number.isFinite(qty) || qty <= 0) continue;
    merged.set(productId, (merged.get(productId) ?? 0) + qty);
  }

  const items = [...merged.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
  if (!storeId || !items.length) return empty;
  return { storeId, items };
}

export function cartMatchesShareParam(
  cart: CartItem[],
  raw: string | null | undefined,
): boolean {
  const { storeId, items } = decodeShareCartParam(raw);
  const productLines = cart.filter((l) => l.kind === "product");
  if (!items.length || productLines.length !== items.length) return false;
  if ((cart[0]?.storeId ?? "") !== storeId) return false;
  const shareMap = new Map(items.map((i) => [i.productId, i.quantity]));
  return productLines.every(
    (line) => shareMap.get(line.productId ?? "") === line.quantity,
  );
}

export function buildShareCartPath(
  cartPath: string,
  storeId: string,
  items: SharedCartItem[],
): string {
  const param = encodeShareCartParam(storeId, items);
  if (!param) return cartPath;
  const sep = cartPath.includes("?") ? "&" : "?";
  return `${cartPath}${sep}share=${encodeURIComponent(param)}`;
}

export function buildShareCartUrl(
  cartPath: string,
  storeId: string,
  items: SharedCartItem[],
): string {
  const href = buildShareCartPath(cartPath, storeId, items);
  if (typeof globalThis === "undefined" || !globalThis.location) return href;
  return `${globalThis.location.origin}${href}`;
}

export type ImportSharedCartResult = {
  lines: CartItem[];
  skipped: { productId: string; label: string }[];
};

/**
 * Rehace las líneas del carrito a partir del enlace: carga el catálogo público de
 * la tienda una sola vez y busca cada producto por id (aplicando disponibilidad y
 * moneda única, como en la referencia).
 */
export async function importSharedCartItems(
  storeId: string,
  items: SharedCartItem[],
  viewerUserId: string,
): Promise<ImportSharedCartResult> {
  if (!storeId || !items.length) return { lines: [], skipped: [] };

  let products;
  try {
    const detail = await fetchStoreDetail(storeId, { userId: viewerUserId });
    products = detail.catalog.products;
  } catch {
    return {
      lines: [],
      skipped: items.map((i) => ({
        productId: i.productId,
        label: "No se pudo cargar la tienda",
      })),
    };
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: CartItem[] = [];
  const skipped: ImportSharedCartResult["skipped"] = [];
  let cartCurrency: string | null = null;

  for (const item of items) {
    const p = byId.get(item.productId);
    if (!p) {
      skipped.push({ productId: item.productId, label: "Producto no encontrado" });
      continue;
    }
    if (!p.published || p.availability.trim().length === 0) {
      skipped.push({
        productId: item.productId,
        label: `${p.name} no está disponible`,
      });
      continue;
    }
    const currency = p.monedaPrecio?.trim() || catalogMonedasList(p)[0] || "";
    if (!cartCurrency) cartCurrency = currency;
    if (currency !== cartCurrency) {
      skipped.push({
        productId: item.productId,
        label: `${p.name} usa otra moneda (${currency})`,
      });
      continue;
    }

    lines.push({
      kind: "product",
      productId: p.id,
      storeId: p.storeId,
      name: p.name,
      unitPrice: parseProductPriceNumber(p.price) ?? 0,
      currencyCode: currency,
      quantity: Math.max(1, item.quantity),
      photoUrl: p.photoUrls[0],
    });
  }

  return { lines, skipped };
}
