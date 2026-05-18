import { vi } from "vitest";

vi.mock("@features/profile/stores/StoreLocationMapModal", () => ({
  StoreLocationMapModal: () => null,
}));
