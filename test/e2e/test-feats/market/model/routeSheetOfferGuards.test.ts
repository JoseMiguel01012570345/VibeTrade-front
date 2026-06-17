import { describe, expect, test } from "vitest";
import type { RouteOfferPublicState } from "@app/store/marketStoreTypes";
import {
  routeSheetAllowsCarrierContactEditWhenPaid,
  routeSheetStructuralEditBlockedByPaid,
  routeSheetVacantStopIds,
} from "@features/market/model/routeSheetOfferGuards";

function offer(
  sheetId: string,
  tramos: RouteOfferPublicState["tramos"],
): RouteOfferPublicState {
  return {
    routeSheetId: sheetId,
    tramos,
  } as RouteOfferPublicState;
}

describe("routeSheetOfferGuards — paid contact-only edit", () => {
  test("vacantStopIds excludes confirmed assignments", () => {
    const vacant = routeSheetVacantStopIds(
      offer("rs1", [
        { stopId: "s1", assignment: { status: "confirmed" } },
        { stopId: "s2", assignment: { status: "pending" } },
      ] as RouteOfferPublicState["tramos"]),
      "rs1",
    );
    expect([...vacant]).toEqual(["s2"]);
  });

  test("allows carrier contact edit when paid and vacant tramos exist", () => {
    expect(
      routeSheetAllowsCarrierContactEditWhenPaid(
        true,
        offer("rs1", [
          { stopId: "s1", assignment: { status: "confirmed" } },
          { stopId: "s2" },
        ] as RouteOfferPublicState["tramos"]),
        "rs1",
      ),
    ).toBe(true);
  });

  test("blocks structural edit when paid and all tramos confirmed", () => {
    expect(
      routeSheetStructuralEditBlockedByPaid(
        true,
        offer("rs1", [
          { stopId: "s1", assignment: { status: "confirmed" } },
        ] as RouteOfferPublicState["tramos"]),
        "rs1",
      ),
    ).toBe(true);
  });

  test("allows structural unlock path when vacant after expulsion", () => {
    expect(
      routeSheetStructuralEditBlockedByPaid(
        true,
        offer("rs1", [{ stopId: "s1" }] as RouteOfferPublicState["tramos"]),
        "rs1",
      ),
    ).toBe(false);
  });

  test("returns empty vacant set when offer sheet mismatch", () => {
    expect(routeSheetVacantStopIds(offer("other", []), "rs1").size).toBe(0);
  });
});
