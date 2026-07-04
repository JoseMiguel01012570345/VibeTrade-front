import { create } from "zustand";

/**
 * Cuenta de personal (staff) de una tienda, creada por el super admin (dueño).
 * El personal inicia sesión con `<username, password>` y queda restringido al
 * panel de su tienda.
 */
export type StoreStaffAccount = {
  id: string;
  storeId: string;
  username: string;
  password: string;
  displayName: string;
  active: boolean;
  createdAt: number;
};

/** Código de afiliado gestionado por la tienda. */
export type StoreAffiliate = {
  id: string;
  storeId: string;
  name: string;
  code: string;
  commissionPercent: number;
  active: boolean;
  createdAt: number;
};

/** Almacén / punto de despacho de la tienda. */
export type StoreWarehouse = {
  id: string;
  storeId: string;
  name: string;
  address: string;
  active: boolean;
  createdAt: number;
};

type StoreAdminExtrasState = {
  staff: StoreStaffAccount[];
  affiliates: StoreAffiliate[];
  warehouses: StoreWarehouse[];

  addStaff: (
    input: Omit<StoreStaffAccount, "id" | "createdAt" | "active">,
  ) => { ok: boolean; error?: string };
  updateStaffPassword: (id: string, password: string) => void;
  setStaffActive: (id: string, active: boolean) => void;
  removeStaff: (id: string) => void;
  findStaffByCredentials: (
    username: string,
    password: string,
  ) => StoreStaffAccount | undefined;

  addAffiliate: (
    input: Omit<StoreAffiliate, "id" | "createdAt" | "active">,
  ) => { ok: boolean; error?: string };
  setAffiliateActive: (id: string, active: boolean) => void;
  removeAffiliate: (id: string) => void;

  addWarehouse: (
    input: Omit<StoreWarehouse, "id" | "createdAt" | "active">,
  ) => void;
  setWarehouseActive: (id: string, active: boolean) => void;
  removeWarehouse: (id: string) => void;
};

const STORAGE_KEY = "vt.store-admin.extras.v1";

type PersistShape = Pick<
  StoreAdminExtrasState,
  "staff" | "affiliates" | "warehouses"
>;

function loadPersisted(): PersistShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { staff: [], affiliates: [], warehouses: [] };
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    return {
      staff: Array.isArray(parsed.staff) ? parsed.staff : [],
      affiliates: Array.isArray(parsed.affiliates) ? parsed.affiliates : [],
      warehouses: Array.isArray(parsed.warehouses) ? parsed.warehouses : [],
    };
  } catch {
    return { staff: [], affiliates: [], warehouses: [] };
  }
}

function persist(state: PersistShape) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        staff: state.staff,
        affiliates: state.affiliates,
        warehouses: state.warehouses,
      }),
    );
  } catch {
    /* almacenamiento no disponible */
  }
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function normUsername(u: string) {
  return u.trim().toLowerCase();
}

export const useStoreAdminExtras = create<StoreAdminExtrasState>((set, get) => ({
  ...loadPersisted(),

  addStaff: (input) => {
    const username = input.username.trim();
    const password = input.password;
    if (username.length < 3)
      return { ok: false, error: "El usuario debe tener al menos 3 caracteres." };
    if (password.length < 4)
      return { ok: false, error: "La contraseña debe tener al menos 4 caracteres." };
    const clash = get().staff.some(
      (s) =>
        s.storeId === input.storeId &&
        normUsername(s.username) === normUsername(username),
    );
    if (clash)
      return { ok: false, error: "Ya existe personal con ese usuario en la tienda." };
    const account: StoreStaffAccount = {
      id: uid("staff"),
      storeId: input.storeId,
      username,
      password,
      displayName: input.displayName.trim() || username,
      active: true,
      createdAt: Date.now(),
    };
    set((s) => {
      const next = { ...s, staff: [account, ...s.staff] };
      persist(next);
      return next;
    });
    return { ok: true };
  },

  updateStaffPassword: (id, password) =>
    set((s) => {
      const next = {
        ...s,
        staff: s.staff.map((x) => (x.id === id ? { ...x, password } : x)),
      };
      persist(next);
      return next;
    }),

  setStaffActive: (id, active) =>
    set((s) => {
      const next = {
        ...s,
        staff: s.staff.map((x) => (x.id === id ? { ...x, active } : x)),
      };
      persist(next);
      return next;
    }),

  removeStaff: (id) =>
    set((s) => {
      const next = { ...s, staff: s.staff.filter((x) => x.id !== id) };
      persist(next);
      return next;
    }),

  findStaffByCredentials: (username, password) =>
    get().staff.find(
      (s) =>
        s.active &&
        normUsername(s.username) === normUsername(username) &&
        s.password === password,
    ),

  addAffiliate: (input) => {
    const name = input.name.trim();
    const code = input.code.trim().toUpperCase();
    if (!name) return { ok: false, error: "El nombre es obligatorio." };
    if (code.length < 3)
      return { ok: false, error: "El código debe tener al menos 3 caracteres." };
    const clash = get().affiliates.some(
      (a) => a.storeId === input.storeId && a.code.toUpperCase() === code,
    );
    if (clash) return { ok: false, error: "Ese código ya existe en la tienda." };
    const affiliate: StoreAffiliate = {
      id: uid("aff"),
      storeId: input.storeId,
      name,
      code,
      commissionPercent: Math.max(0, Math.min(100, input.commissionPercent)),
      active: true,
      createdAt: Date.now(),
    };
    set((s) => {
      const next = { ...s, affiliates: [affiliate, ...s.affiliates] };
      persist(next);
      return next;
    });
    return { ok: true };
  },

  setAffiliateActive: (id, active) =>
    set((s) => {
      const next = {
        ...s,
        affiliates: s.affiliates.map((x) =>
          x.id === id ? { ...x, active } : x,
        ),
      };
      persist(next);
      return next;
    }),

  removeAffiliate: (id) =>
    set((s) => {
      const next = {
        ...s,
        affiliates: s.affiliates.filter((x) => x.id !== id),
      };
      persist(next);
      return next;
    }),

  addWarehouse: (input) =>
    set((s) => {
      const warehouse: StoreWarehouse = {
        id: uid("wh"),
        storeId: input.storeId,
        name: input.name.trim(),
        address: input.address.trim(),
        active: true,
        createdAt: Date.now(),
      };
      const next = { ...s, warehouses: [warehouse, ...s.warehouses] };
      persist(next);
      return next;
    }),

  setWarehouseActive: (id, active) =>
    set((s) => {
      const next = {
        ...s,
        warehouses: s.warehouses.map((x) =>
          x.id === id ? { ...x, active } : x,
        ),
      };
      persist(next);
      return next;
    }),

  removeWarehouse: (id) =>
    set((s) => {
      const next = {
        ...s,
        warehouses: s.warehouses.filter((x) => x.id !== id),
      };
      persist(next);
      return next;
    }),
}));

export function staffForStore(
  all: StoreStaffAccount[],
  storeId: string,
): StoreStaffAccount[] {
  return all.filter((s) => s.storeId === storeId);
}

export function affiliatesForStore(
  all: StoreAffiliate[],
  storeId: string,
): StoreAffiliate[] {
  return all.filter((a) => a.storeId === storeId);
}

export function warehousesForStore(
  all: StoreWarehouse[],
  storeId: string,
): StoreWarehouse[] {
  return all.filter((w) => w.storeId === storeId);
}
