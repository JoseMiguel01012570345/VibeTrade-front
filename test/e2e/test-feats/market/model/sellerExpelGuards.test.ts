import { describe, expect, test } from "vitest";
import {
  carrierDeliveryBlocksSellerExpel,
  sellerExpelBlockedForCarrier,
  sellerExpelBlockedForStop,
} from "@features/market/model/routeSheetOfferGuards";
import type { RouteStopDeliveryStatusApi } from "@/utils/chat/routeLogisticsApi";

const carrierId = "carrier-1";

function delivery(
  partial: Partial<RouteStopDeliveryStatusApi> &
    Pick<RouteStopDeliveryStatusApi, "routeSheetId" | "routeStopId">,
): RouteStopDeliveryStatusApi {
  return {
    state: "unpaid",
    ...partial,
  };
}

describe("sellerExpelGuards", () => {
  test("blocks expel when carrier owns in_transit tramo", () => {
    expect(
      carrierDeliveryBlocksSellerExpel(
        { state: "in_transit", currentOwnerUserId: carrierId },
        carrierId,
      ),
    ).toBe(true);
  });

  test("allows expel when tramo is paused (idle_store_custody)", () => {
    expect(
      carrierDeliveryBlocksSellerExpel(
        { state: "idle_store_custody", currentOwnerUserId: carrierId },
        carrierId,
      ),
    ).toBe(false);
  });

  test("sellerExpelBlockedForStop resolves delivery row", () => {
    const rows = [
      delivery({
        routeSheetId: "rs1",
        routeStopId: "s1",
        state: "in_transit",
        currentOwnerUserId: carrierId,
      }),
    ];
    expect(sellerExpelBlockedForStop(rows, "rs1", "s1", carrierId)).toBe(true);
    expect(sellerExpelBlockedForStop(rows, "rs1", "s2", carrierId)).toBe(false);
  });

  test("sellerExpelBlockedForCarrier checks any confirmed tramo", () => {
    const rows = [
      delivery({
        routeSheetId: "rs1",
        routeStopId: "s1",
        state: "evidence_accepted",
        currentOwnerUserId: carrierId,
      }),
      delivery({
        routeSheetId: "rs1",
        routeStopId: "s2",
        state: "in_transit",
        currentOwnerUserId: carrierId,
      }),
    ];
    expect(
      sellerExpelBlockedForCarrier(
        rows,
        [
          { routeSheetId: "rs1", stopId: "s1" },
          { routeSheetId: "rs1", stopId: "s2" },
        ],
        carrierId,
      ),
    ).toBe(true);
  });
});
