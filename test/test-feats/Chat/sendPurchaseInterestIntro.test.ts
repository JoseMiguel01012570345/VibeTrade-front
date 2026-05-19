import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  catalogItemKind,
  collectOfferPublishedPhotoUrls,
  sendPurchaseInterestIntro,
} from "@/utils/chat/sendPurchaseInterestIntro";
import { makeOffer } from "@test/Resources/Chat/thread-factories";
import type { StoreCatalog } from "@features/market/model/storeCatalogTypes";
import {
  mockPostChatMessage,
  mockPostChatTextMessage,
  mockUploadMediaBlob,
  resetChatApiMocks,
} from "@test/Resources/Chat/chat-api-mocks";

vi.mock("@/utils/chat/chatApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/chat/chatApi")>();
  const mocks = await import("@test/Resources/Chat/chat-api-mocks");
  return {
    ...actual,
    postChatMessage: (...args: unknown[]) => mocks.mockPostChatMessage(...args),
    postChatTextMessage: (...args: unknown[]) =>
      mocks.mockPostChatTextMessage(...args),
  };
});

vi.mock("@/utils/media/mediaClient", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/utils/media/mediaClient")>();
  const mocks = await import("@test/Resources/Chat/chat-api-mocks");
  return {
    ...actual,
    uploadMediaBlob: (...args: unknown[]) => mocks.mockUploadMediaBlob(...args),
    mediaApiUrl: (id: string) => `/api/v1/media/${id}`,
  };
});

const catalog: StoreCatalog = {
  storeId: "store-1",
  products: [{ id: "offer-1", name: "P", price: "1", description: "" }],
  services: [],
};

describe("sendPurchaseInterestIntro", () => {
  beforeEach(() => {
    resetChatApiMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
      }),
    );
  });

  it("catalogItemKind detects product vs service", () => {
    const offer = makeOffer({ id: "offer-1", storeId: "store-1" });
    expect(catalogItemKind(offer, { "store-1": catalog })).toBe("product");
    const svcCatalog: StoreCatalog = {
      storeId: "store-1",
      products: [],
      services: [{ id: "svc-1", name: "S", price: "1", description: "" }],
    };
    expect(catalogItemKind(makeOffer({ id: "svc-1" }), { "store-1": svcCatalog })).toBe(
      "service",
    );
  });

  it("collectOfferPublishedPhotoUrls dedupes and skips placeholders", () => {
    const urls = collectOfferPublishedPhotoUrls(
      makeOffer({
        imageUrl: "https://cdn.example/a.jpg",
        imageUrls: [
          "https://cdn.example/a.jpg",
          "/tool.png",
        ],
      }),
    );
    expect(urls).toEqual(["https://cdn.example/a.jpg"]);
  });

  it("posts text-only when no photos", async () => {
    await sendPurchaseInterestIntro(
      "cth_abc123",
      makeOffer({ imageUrl: "", imageUrls: [] }),
      {},
    );
    expect(mockPostChatMessage).toHaveBeenCalledWith(
      "cth_abc123",
      expect.objectContaining({
        text: expect.stringContaining("interés"),
      }),
    );
    const body = mockPostChatMessage.mock.calls[0]![1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("type");
    expect(mockPostChatTextMessage).not.toHaveBeenCalled();
  });

  it("posts image message with media refs when photos exist", async () => {
    await sendPurchaseInterestIntro(
      "cth_abc123",
      makeOffer({
        imageUrl: "https://cdn.example/photo.jpg",
        imageUrls: ["https://cdn.example/photo.jpg"],
        title: "Zapatillas",
      }),
      { "store-1": catalog },
    );
    expect(mockUploadMediaBlob).toHaveBeenCalled();
    expect(mockPostChatMessage).toHaveBeenCalledWith(
      "cth_abc123",
      expect.objectContaining({
        images: expect.arrayContaining([
          { url: "/api/v1/media/media_test_1" },
        ]),
        caption: expect.stringContaining("Zapatillas"),
      }),
    );
    const body = mockPostChatMessage.mock.calls[0]![1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("type");
  });

});
