import type {
  OwnerStoreFormValues,
} from "@app/store/marketStoreTypes";
import type { StoreBadge } from "@app/store/marketStoreTypes";

export function makeStoreBadge(
  overrides: Partial<StoreBadge> = {},
): StoreBadge {
  return {
    id: "store-1",
    name: "Tienda Alpha",
    verified: true,
    categories: ["Electrónica", "Hogar"],
    transportIncluded: true,
    trustScore: 85,
    pitch: "Productos de calidad",
    ownerUserId: "user-test-1",
    ...overrides,
  };
}

export function makeOwnerStoreFormValues(
  overrides: Partial<OwnerStoreFormValues> = {},
): OwnerStoreFormValues {
  return {
    name: "Tienda Nueva",
    categories: ["Electrónica"],
    categoryPitch: "Vendemos electrónica de consumo",
    transportIncluded: true,
    websiteUrl: "",
    ...overrides,
  };
}
