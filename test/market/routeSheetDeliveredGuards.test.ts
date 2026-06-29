import { describe, expect, it } from "vitest";
import {
  routeSheetPublishBlockedWhenDelivered,
  routeStopTramoDeliveredByEvidence,
  routeStopTramoSubscribeBlocked,
  routeStopTramoSubscribeBlockedOnSheet,
} from "@features/chat/logic/route-sheet/routeSheetOfferGuards";
import type { RouteSheet } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import type { RouteStopDeliveryStatusApi } from "@features/chat/Dtos/route-sheet/routeLogisticsApiTypes";

function sheet(partial: Partial<RouteSheet> & Pick<RouteSheet, "id">): RouteSheet {
  return {
    threadId: "cth_1",
    titulo: "Ruta",
    creadoEn: 0,
    actualizadoEn: 0,
    estado: "programada",
    mercanciasResumen: "Test",
    paradas: [],
    ...partial,
    id: partial.id,
  };
}

function delivery(
  partial: Partial<RouteStopDeliveryStatusApi> &
    Pick<RouteStopDeliveryStatusApi, "routeSheetId" | "routeStopId">,
): RouteStopDeliveryStatusApi {
  return {
    state: "unpaid",
    ...partial,
  };
}

describe("routeSheetPublishBlockedWhenDelivered", () => {
  it("bloquea publicar cuando estado es entregada", () => {
    expect(routeSheetPublishBlockedWhenDelivered("entregada")).toBe(true);
    expect(routeSheetPublishBlockedWhenDelivered("Entregada")).toBe(true);
  });

  it("no bloquea hoja en tránsito o programada", () => {
    expect(routeSheetPublishBlockedWhenDelivered("en_transito")).toBe(false);
    expect(routeSheetPublishBlockedWhenDelivered("programada")).toBe(false);
    expect(routeSheetPublishBlockedWhenDelivered(undefined)).toBe(false);
  });
});

describe("routeStopTramoDeliveredByEvidence", () => {
  it("detecta evidence_accepted", () => {
    expect(
      routeStopTramoDeliveredByEvidence({ state: "evidence_accepted" }),
    ).toBe(true);
  });

  it("no marca tramo en curso como entregado", () => {
    expect(routeStopTramoDeliveredByEvidence({ state: "in_transit" })).toBe(
      false,
    );
    expect(routeStopTramoSubscribeBlocked([], "rs1", "stop_1")).toBe(false);
  });
});

describe("routeStopTramoSubscribeBlocked", () => {
  it("bloquea suscripción al tramo con evidencia aceptada", () => {
    const deliveries = [
      delivery({
        routeSheetId: "rs1",
        routeStopId: "stop_0",
        state: "evidence_accepted",
      }),
    ];
    expect(
      routeStopTramoSubscribeBlocked(deliveries, "rs1", "stop_0"),
    ).toBe(true);
    expect(
      routeStopTramoSubscribeBlocked(deliveries, "rs1", "stop_1"),
    ).toBe(false);
  });
});

describe("routeStopTramoSubscribeBlockedOnSheet", () => {
  it("bloquea si la hoja está entregada", () => {
    expect(
      routeStopTramoSubscribeBlockedOnSheet(
        sheet({ id: "rs1", estado: "entregada" }),
        "stop_1",
      ),
    ).toBe(true);
  });

  it("bloquea si la parada está marcada completada", () => {
    expect(
      routeStopTramoSubscribeBlockedOnSheet(
        sheet({
          id: "rs1",
          paradas: [
            {
              id: "stop_1",
              orden: 1,
              origen: "A",
              destino: "B",
              completada: true,
            },
          ],
        }),
        "stop_1",
      ),
    ).toBe(true);
  });

  it("permite suscripción en tramo activo", () => {
    expect(
      routeStopTramoSubscribeBlockedOnSheet(
        sheet({
          id: "rs1",
          paradas: [
            {
              id: "stop_1",
              orden: 1,
              origen: "A",
              destino: "B",
            },
          ],
        }),
        "stop_1",
      ),
    ).toBe(false);
  });
});
