import { describe, expect, it } from "vitest";
import {
  routePathsAwaitUnconfirmedCarriers,
  shouldWarnUnconfirmedRouteCarriers,
} from "@features/chat/logic/payments/chatPaymentUtils";
import type { AgreementRoutePathApi } from "@features/chat/Dtos/agreement/agreementCheckoutApiTypes";
import type { TradeAgreement } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import { emptyMerchandiseLine } from "@features/chat/logic/agreement/tradeAgreementTypes";

function path(partial: Partial<AgreementRoutePathApi>): AgreementRoutePathApi {
  return {
    routePathId: partial.routePathId ?? "stop1",
    orden: partial.orden ?? 1,
    label: partial.label ?? "Tramo",
    stopIds: partial.stopIds ?? ["stop1"],
    stops: partial.stops ?? [],
    totalsByCurrency: partial.totalsByCurrency ?? [
      { currencyLower: "usd", amountMinor: 10_000 },
    ],
    payable: partial.payable ?? false,
    paid: partial.paid ?? false,
    partiallyPaid: partial.partiallyPaid ?? false,
  };
}

function merchAg(partial?: Partial<TradeAgreement>): TradeAgreement {
  return {
    id: "agr1",
    threadId: "cth_1",
    title: "Test",
    status: "accepted",
    issuedAt: 0,
    issuedByStoreId: "st",
    issuerLabel: "Tienda",
    includeMerchandise: true,
    includeService: false,
    merchandise: [
      {
        ...emptyMerchandiseLine(),
        id: "m1",
        cantidad: "1",
        valorUnitario: "10",
        moneda: "USD",
      },
    ],
    routeSheetId: "rs1",
    ...partial,
  };
}

describe("route carrier payment warning", () => {
  it("detecta tramos con precio sin carriers confirmados", () => {
    const awaiting = routePathsAwaitUnconfirmedCarriers([
      path({ payable: false }),
      path({ routePathId: "p2", payable: true, paid: false }),
    ]);
    expect(awaiting).toHaveLength(1);
  });

  it("avisa si hay hoja vinculada, transporte impago y carriers pendientes", () => {
    expect(
      shouldWarnUnconfirmedRouteCarriers(
        merchAg(),
        [path({ payable: false })],
        false,
      ),
    ).toBe(true);
  });

  it("no avisa si el transporte ya está pagado", () => {
    expect(
      shouldWarnUnconfirmedRouteCarriers(
        merchAg(),
        [path({ paid: true, payable: false })],
        false,
      ),
    ).toBe(false);
  });

  it("no avisa si el acuerdo tiene cobros y la hoja vinculada está entregada", () => {
    expect(
      shouldWarnUnconfirmedRouteCarriers(
        merchAg({ hasSucceededPayments: true }),
        [path({ payable: false })],
        false,
        { estado: "entregada" },
      ),
    ).toBe(false);
  });

  it("sigue avisando si la hoja no está entregada aunque el acuerdo tenga cobros", () => {
    expect(
      shouldWarnUnconfirmedRouteCarriers(
        merchAg({ hasSucceededPayments: true }),
        [path({ payable: false })],
        false,
        { estado: "en_transito" },
      ),
    ).toBe(true);
  });

  it("no avisa sin hoja vinculada", () => {
    expect(
      shouldWarnUnconfirmedRouteCarriers(
        merchAg({ routeSheetId: undefined }),
        [path({ payable: false })],
        false,
      ),
    ).toBe(false);
  });
});
