import { vi } from "vitest";
import "./setup-store-location-map-modal";

vi.mock("@/utils/market/fetchStoreDetail", () => ({
  fetchStoreDetail: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/utils/market/marketPersistence", () => ({
  saveMarketStoreProfiles: vi.fn().mockResolvedValue(undefined),
  setMarketHydrating: vi.fn(),
}));

vi.mock("@/utils/market/fetchCatalogCategories", () => ({
  fetchCatalogCategories: vi.fn().mockResolvedValue(["Electrónica"]),
}));
