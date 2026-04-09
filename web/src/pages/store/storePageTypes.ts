export type StoreScreen = "catalog" | "vitrina" | "products" | "services";

export type PriceSort = "none" | "asc" | "desc";

export const PRODUCT_CONDITION_FILTER_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "nuevo", label: "Nuevo" },
  { value: "usado", label: "Usado" },
  { value: "reacondicionado", label: "Reacondicionado" },
] as const;
