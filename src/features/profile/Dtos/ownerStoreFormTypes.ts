import type { StoreLocationPoint } from "@shared/Dtos/storeLocationPoint";

/** Alta de tienda desde perfil (flow-ui: nombre, categorías, descripción, transporte). */
export type OwnerStoreFormValues = {
  name: string;
  categories: string[];
  categoryPitch: string;
  transportIncluded: boolean;
  /** Opcional: pin en mapa (OpenStreetMap). */
  location?: StoreLocationPoint;
  /** Opcional: URL del sitio (se normaliza a https al guardar). */
  websiteUrl?: string;
};

/** Parcial permitido al actualizar tienda (incl. imagen de vitrina). */
export type OwnerStorePatch = Partial<
  OwnerStoreFormValues & {
    avatarUrl: string | null | undefined;
    websiteUrl: string | null | undefined;
  }
>;
