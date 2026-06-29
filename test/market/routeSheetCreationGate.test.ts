import { describe, expect, it } from "vitest";
import {
  agreementNeedsRouteSheetSlot,
  threadCanCreateRouteSheet,
  threadRouteSheetCreationBlocked,
  threadRouteSheetSlotCount,
} from "@features/chat/model/routeSheetCreationGate";
import type { TradeAgreement } from "@features/chat/model/tradeAgreementTypes";

function agr(partial: Partial<TradeAgreement> & Pick<TradeAgreement, "id">): TradeAgreement {
  return {
    threadId: "cth_1",
    title: "A",
    status: "accepted",
    issuedAt: 0,
    issuedByStoreId: "st",
    issuerLabel: "Tienda",
    includeMerchandise: false,
    includeService: false,
    merchandise: [],
    ...partial,
    id: partial.id,
  };
}

describe("routeSheetCreationGate", () => {
  it("cuenta acuerdo aceptado sin pago", () => {
    const a = agr({ id: "1" });
    expect(agreementNeedsRouteSheetSlot(a)).toBe(true);
    expect(threadCanCreateRouteSheet([a])).toBe(true);
    expect(threadRouteSheetSlotCount([a])).toBe(1);
  });

  it("cuenta acuerdo con cobro pero sin hoja vinculada", () => {
    const a = agr({ id: "1", hasSucceededPayments: true });
    expect(agreementNeedsRouteSheetSlot(a)).toBe(true);
    expect(threadCanCreateRouteSheet([a])).toBe(true);
  });

  it("no cuenta acuerdo con cobro y hoja vinculada", () => {
    const a = agr({
      id: "1",
      hasSucceededPayments: true,
      routeSheetId: "rs1",
    });
    expect(agreementNeedsRouteSheetSlot(a)).toBe(false);
    expect(threadCanCreateRouteSheet([a])).toBe(false);
    expect(threadRouteSheetSlotCount([a])).toBe(0);
    expect(threadRouteSheetCreationBlocked([a], 1)).toBe(true);
  });

  it("unpaid con hoja vinculada sigue ocupando cupo", () => {
    const a = agr({ id: "1", routeSheetId: "rs1" });
    expect(agreementNeedsRouteSheetSlot(a)).toBe(true);
    expect(threadRouteSheetCreationBlocked([a], 1)).toBe(true);
    expect(threadRouteSheetCreationBlocked([a], 0)).toBe(false);
  });

  it("ignora acuerdos no aceptados", () => {
    const pending = agr({ id: "1", status: "pending_buyer" });
    expect(threadCanCreateRouteSheet([pending])).toBe(false);
  });
});
