import { create } from "zustand";

const STORAGE_KEY = "vt.cart.v1";

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

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  removeItem: (lineKey: string) => void;
  replaceCart: (items: CartItem[]) => void;
  clear: () => void;
};

function readStored(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((i) => ({
      ...i,
      kind: i.kind === "service" ? "service" : "product",
      productId: i.kind === "service" ? undefined : i.productId,
      serviceId: i.kind === "service" ? i.serviceId : undefined,
    }));
  } catch {
    return [];
  }
}

function persist(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* modo privado / no disponible */
  }
}

export const useCartStore = create<CartState>((set) => ({
  items: readStored(),

  addItem: (item) =>
    set((s) => {
      const differentStore =
        s.items.length > 0 && s.items[0]!.storeId !== item.storeId;
      const base = differentStore ? [] : s.items;
      const key = cartLineKey(item);
      const existing = base.find((i) => cartLineKey(i) === key);
      const next = existing
        ? base.map((i) =>
            cartLineKey(i) === key
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          )
        : [...base, item];
      persist(next);
      return { items: next };
    }),

  setQuantity: (lineKey, quantity) =>
    set((s) => {
      const q = Math.max(1, Math.floor(quantity) || 1);
      const next = s.items.map((i) =>
        cartLineKey(i) === lineKey ? { ...i, quantity: q } : i,
      );
      persist(next);
      return { items: next };
    }),

  removeItem: (lineKey) =>
    set((s) => {
      const next = s.items.filter((i) => cartLineKey(i) !== lineKey);
      persist(next);
      return { items: next };
    }),

  replaceCart: (items) =>
    set(() => {
      persist(items);
      return { items };
    }),

  clear: () =>
    set(() => {
      persist([]);
      return { items: [] };
    }),
}));

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function cartHasProducts(items: CartItem[]): boolean {
  return items.some((i) => i.kind === "product");
}
