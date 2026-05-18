import { describe, expect, it } from "vitest";
import {
  effectiveTramoContactPhone,
  normRoutePhoneKey,
} from "@features/market/model/routeSheetOfferGuards";
import type { RouteStop } from "@features/market/model/routeSheetTypes";

describe("routeSheetOfferGuards", () => {
  it("normRoutePhoneKey strips spaces and dashes", () => {
    expect(normRoutePhoneKey("+54 9 11 1234-5678")).toBe("+5491112345678");
  });

  it("effectiveTramoContactPhone prefers stop phone", () => {
    const stop = {
      id: "s1",
      telefonoTransportista: " 111 ",
    } as RouteStop;
    expect(
      effectiveTramoContactPhone(stop, {
        stopId: "s1",
        orden: 0,
        origenLine: "",
        destinoLine: "",
        telefonoTransportista: "222",
        assignment: {
          userId: "u1",
          displayName: "Carrier",
          trustScore: 5,
          phone: "333",
          status: "confirmed",
        },
      }),
    ).toBe("111");
  });
});
