import { describe, expect, it } from "vitest";
import { threadShowsRouteSheets } from "@features/chat/logic/route-sheet/routeSheetOfferGuards";
import type {
  MarketState,
  Thread,
} from "@features/market/logic/store/marketStoreTypes";

function thread(partial: Partial<Thread> & Pick<Thread, "id" | "offerId">): Thread {
  return {
    storeId: "st_1",
    store: { id: "st_1", name: "Tienda", slug: "tienda" },
    messages: [],
    ...partial,
    id: partial.id,
    offerId: partial.offerId,
  } as Thread;
}

function state(
  partial: Partial<Pick<MarketState, "threads" | "routeOfferPublic" | "offers">>,
): Pick<MarketState, "threads" | "routeOfferPublic" | "offers"> {
  return {
    threads: {},
    routeOfferPublic: {},
    offers: {},
    ...partial,
  };
}

describe("threadShowsRouteSheets", () => {
  it("false sin transportistas ni tramos confirmados", () => {
    const th = thread({ id: "cth_1", offerId: "off_1" });
    const s = state({
      routeOfferPublic: {
        ro_1: {
          threadId: "cth_1",
          routeSheetId: "rs_1",
          routeTitle: "Ruta",
          tramos: [{ assignment: { status: "pending", userId: "u1" } }],
        } as unknown as MarketState["routeOfferPublic"][string],
      },
    });
    expect(threadShowsRouteSheets(s, th)).toBe(false);
  });

  it("true con tramo confirmado en routeOfferPublic del hilo", () => {
    const th = thread({ id: "cth_1", offerId: "off_1" });
    const s = state({
      routeOfferPublic: {
        ro_1: {
          threadId: "cth_1",
          routeSheetId: "rs_1",
          routeTitle: "Ruta",
          tramos: [{ assignment: { status: "confirmed", userId: "carrier_1" } }],
        } as unknown as MarketState["routeOfferPublic"][string],
      },
    });
    expect(threadShowsRouteSheets(s, th)).toBe(true);
  });

  it("true si el hilo lista chatCarriers", () => {
    const th = thread({
      id: "cth_1",
      offerId: "off_1",
      chatCarriers: [
        {
          id: "carrier_1",
          name: "Transportista",
          phone: "+54911",
          trustScore: 5,
          vehicleLabel: "Camión",
          tramoLabel: "Tramo 1",
        },
      ],
    });
    expect(threadShowsRouteSheets(state({}), th)).toBe(true);
  });
});
