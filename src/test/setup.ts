import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { resetAppStore, resetMarketStore } from "./storeBuilders";
import { resetApiMocks } from "./resetApiMocks";
import "./vitestMocks";

beforeEach(() => {
  resetApiMocks();
});

afterEach(() => {
  cleanup();
  resetAppStore();
  resetMarketStore();
  vi.clearAllMocks();
});

Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}
