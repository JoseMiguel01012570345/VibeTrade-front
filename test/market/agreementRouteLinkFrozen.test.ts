import { describe, expect, it } from "vitest";
import {
  agreementRouteLinkFrozen,
  agreementRouteLinkFrozenAfterPayment,
} from "@features/market/model/tradeAgreementTypes";
import type { TradeAgreement } from "@features/market/model/tradeAgreementTypes";

function ag(
  partial: Partial<TradeAgreement> & Pick<TradeAgreement, "id">,
): TradeAgreement {
  return {
    threadId: "cth_1",
    title: "Test",
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

describe("agreementRouteLinkFrozenAfterPayment", () => {
  it("congela solo con cobros de transporte y hoja vinculada", () => {
    expect(
      agreementRouteLinkFrozenAfterPayment(
        ag({
          id: "a1",
          hasSucceededRoutePayments: true,
          routeSheetId: "rs1",
        }),
      ),
    ).toBe(true);
  });

  it("no congela con cobro de mercancía sin transporte pagado", () => {
    expect(
      agreementRouteLinkFrozenAfterPayment(
        ag({
          id: "a1",
          hasSucceededPayments: true,
          routeSheetId: "rs1",
        }),
      ),
    ).toBe(false);
  });
});

describe("agreementRouteLinkFrozen", () => {
  it("congela con evidencia de mercancía aceptada aunque no haya hoja", () => {
    expect(
      agreementRouteLinkFrozen(
        ag({
          id: "a1",
          hasAcceptedMerchandiseEvidence: true,
        }),
      ),
    ).toBe(true);
  });

  it("congela con transporte pagado y hoja vinculada", () => {
    expect(
      agreementRouteLinkFrozen(
        ag({
          id: "a1",
          hasSucceededRoutePayments: true,
          routeSheetId: "rs1",
        }),
      ),
    ).toBe(true);
  });

  it("no congela con cobro de mercancía sin transporte ni evidencia aceptada", () => {
    expect(
      agreementRouteLinkFrozen(
        ag({
          id: "a1",
          hasSucceededPayments: true,
          routeSheetId: "rs1",
        }),
      ),
    ).toBe(false);
  });
});
