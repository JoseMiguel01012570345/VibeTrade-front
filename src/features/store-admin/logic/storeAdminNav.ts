import {
  BarChart3,
  Boxes,
  Package,
  Share2,
  ShoppingBag,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type StoreAdminSectionId =
  | "productos"
  | "servicios"
  | "pedidos"
  | "estadisticas"
  | "finanzas"
  | "usuarios"
  | "afiliados"
  | "almacenes";

export type StoreAdminNavItem = {
  id: StoreAdminSectionId;
  label: string;
  icon: LucideIcon;
};

export const STORE_ADMIN_NAV: StoreAdminNavItem[] = [
  { id: "productos", label: "Productos", icon: Package },
  { id: "servicios", label: "Servicios", icon: Wrench },
  { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
  { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
  { id: "finanzas", label: "Finanzas", icon: Wallet },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "afiliados", label: "Afiliados", icon: Share2 },
  { id: "almacenes", label: "Almacenes", icon: Boxes },
];

export const DEFAULT_STORE_ADMIN_SECTION: StoreAdminSectionId = "productos";

export function isStoreAdminSection(v: unknown): v is StoreAdminSectionId {
  return (
    typeof v === "string" &&
    STORE_ADMIN_NAV.some((item) => item.id === v)
  );
}

export function sectionLabel(id: StoreAdminSectionId): string {
  return STORE_ADMIN_NAV.find((i) => i.id === id)?.label ?? id;
}
