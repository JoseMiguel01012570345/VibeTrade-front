import { create } from "zustand";

const STORAGE_KEY = "vt.cart.v1";

/** Ítem del carrito con snapshot mínimo para render sin re-fetch. */
export type CartItem = {
  productId: string;
  storeId: string;
  name: string;
  unitPrice: number;
  currencyCode: string;
  quantity: number;
  photoUrl?: string;
};

type CartState = {
  items: CartItem[];
  /** Agrega o incrementa; el carrito es de una sola tienda (si cambia, se reemplaza). */
  addItem: (item: CartItem) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  /** Reemplaza todo el carrito (p. ej. al importar un carrito compartido por enlace). */
  replaceCart: (items: CartItem[]) => void;
  clear: () => void;
};

function readStored(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
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
      const existing = base.find((i) => i.productId === item.productId);
      const next = existing
        ? base.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          )
        : [...base, item];
      persist(next);
      return { items: next };
    }),

  setQuantity: (productId, quantity) =>
    set((s) => {
      const q = Math.max(1, Math.floor(quantity) || 1);
      const next = s.items.map((i) =>
        i.productId === productId ? { ...i, quantity: q } : i,
      );
      persist(next);
      return { items: next };
    }),

  removeItem: (productId) =>
    set((s) => {
      const next = s.items.filter((i) => i.productId !== productId);
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
