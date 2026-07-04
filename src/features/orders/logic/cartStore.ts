import { create } from "zustand";

const STORAGE_KEY = "vt.cart.v2";
const LEGACY_STORAGE_KEY = "vt.cart.v1";

/** Ítem del carrito con snapshot mínimo para render sin re-fetch. */
export type CartItem = {
  kind: "product" | "service";
  productId?: string;
  serviceId?: string;
  storeId: string;
  name: string;
  unitPrice: number;
  currencyCode: string;
  quantity: number;
  photoUrl?: string;
};

export function cartLineKey(item: Pick<CartItem, "kind" | "productId" | "serviceId">): string {
  if (item.kind === "service") return `svc:${item.serviceId ?? ""}`;
  return `prd:${item.productId ?? ""}`;
}

type CartsByStore = Record<string, CartItem[]>;

type CartState = {
  activeStoreId: string | null;
  items: CartItem[];
  /** Carga el carrito de la tienda indicada y persiste el de la tienda anterior. */
  setActiveStore: (storeId: string) => void;
  addItem: (item: CartItem) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  removeItem: (lineKey: string) => void;
  replaceCart: (items: CartItem[]) => void;
  clear: () => void;
};

function normalizeItem(raw: CartItem): CartItem {
  const kind = raw.kind === "service" ? "service" : "product";
  return {
    ...raw,
    kind,
    productId: kind === "service" ? undefined : raw.productId,
    serviceId: kind === "service" ? raw.serviceId : undefined,
  };
}

function normalizeItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((i): i is CartItem => Boolean(i && typeof i === "object"))
    .map((i) => normalizeItem(i));
}

function readAllCarts(): CartsByStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CartsByStore;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const out: CartsByStore = {};
        for (const [storeId, items] of Object.entries(parsed)) {
          const normalized = normalizeItems(items);
          if (normalized.length > 0) out[storeId] = normalized;
        }
        return out;
      }
    }
  } catch {
    /* corrupto */
  }

  return migrateLegacyCart();
}

function migrateLegacyCart(): CartsByStore {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return {};
    const items = normalizeItems(JSON.parse(raw));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    if (!items.length) return {};
    const storeId = items[0]?.storeId?.trim();
    if (!storeId) return {};
    const migrated = { [storeId]: items };
    writeAllCarts(migrated);
    return migrated;
  } catch {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return {};
  }
}

function writeAllCarts(carts: CartsByStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carts));
  } catch {
    /* modo privado / no disponible */
  }
}

function writeStoreCart(storeId: string, items: CartItem[]) {
  const sid = storeId.trim();
  if (!sid) return;
  const all = readAllCarts();
  if (items.length === 0) delete all[sid];
  else all[sid] = items;
  writeAllCarts(all);
}

function switchStoreState(
  current: Pick<CartState, "activeStoreId" | "items">,
  nextStoreId: string,
): Pick<CartState, "activeStoreId" | "items"> {
  const sid = nextStoreId.trim();
  if (!sid || current.activeStoreId === sid) return current;

  const all = readAllCarts();
  if (current.activeStoreId) {
    all[current.activeStoreId] = current.items;
  }
  writeAllCarts(all);

  return {
    activeStoreId: sid,
    items: all[sid] ?? [],
  };
}

function addItemToList(base: CartItem[], item: CartItem): CartItem[] {
  const key = cartLineKey(item);
  const existing = base.find((i) => cartLineKey(i) === key);
  if (existing) {
    return base.map((i) =>
      cartLineKey(i) === key
        ? { ...i, quantity: i.quantity + item.quantity }
        : i,
    );
  }
  return [...base, item];
}

export const useCartStore = create<CartState>((set) => ({
  activeStoreId: null,
  items: [],

  setActiveStore: (storeId) =>
    set((s) => switchStoreState(s, storeId)),

  addItem: (item) =>
    set((s) => {
      const switched = switchStoreState(s, item.storeId);
      const next = addItemToList(switched.items, item);
      writeStoreCart(item.storeId, next);
      return { ...switched, items: next };
    }),

  setQuantity: (lineKey, quantity) =>
    set((s) => {
      const q = Math.max(1, Math.floor(quantity) || 1);
      const next = s.items.map((i) =>
        cartLineKey(i) === lineKey ? { ...i, quantity: q } : i,
      );
      if (s.activeStoreId) writeStoreCart(s.activeStoreId, next);
      return { items: next };
    }),

  removeItem: (lineKey) =>
    set((s) => {
      const next = s.items.filter((i) => cartLineKey(i) !== lineKey);
      if (s.activeStoreId) writeStoreCart(s.activeStoreId, next);
      return { items: next };
    }),

  replaceCart: (items) =>
    set(() => {
      const storeId = items[0]?.storeId?.trim() ?? null;
      if (storeId) writeStoreCart(storeId, items);
      return { activeStoreId: storeId, items };
    }),

  clear: () =>
    set((s) => {
      if (s.activeStoreId) writeStoreCart(s.activeStoreId, []);
      return { items: [] };
    }),
}));

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function cartHasProducts(items: CartItem[]): boolean {
  return items.some((i) => i.kind === "product");
}
