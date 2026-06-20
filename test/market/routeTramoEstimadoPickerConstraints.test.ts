import { describe, expect, it } from "vitest";
import type { RouteTramoFormInput } from "@features/market/model/routeSheetTypes";
import {
  isRouteEstimadoTimeDisabled,
  routeEntregaDateBounds,
  routeRecogidaDateBounds,
} from "@features/market/model/routeTramoEstimadoPickerConstraints";

function tramo(partial: Partial<RouteTramoFormInput>): RouteTramoFormInput {
  return {
    origen: "A",
    destino: "B",
    ...partial,
  };
}

describe("routeTramoEstimadoPickerConstraints", () => {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const dayAfter = new Date(Date.now() + 2 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  it("recogida max is entrega date on same tramo", () => {
    const tramos = [
      tramo({
        tiempoRecogidaEstimado: `${tomorrow}T08:00`,
        tiempoEntregaEstimado: `${dayAfter}T12:00`,
      }),
    ];
    const b = routeRecogidaDateBounds(tramos, 0);
    expect(b.max).toBe(dayAfter);
  });

  it("entrega max is next tramo recogida date", () => {
    const tramos = [
      tramo({
        tiempoRecogidaEstimado: `${tomorrow}T08:00`,
        tiempoEntregaEstimado: `${tomorrow}T12:00`,
      }),
      tramo({
        tiempoRecogidaEstimado: `${dayAfter}T09:00`,
      }),
    ];
    const b = routeEntregaDateBounds(tramos, 0);
    expect(b.max).toBe(dayAfter);
  });

  it("disables recogida time not strictly before entrega on same day", () => {
    const tramos = [
      tramo({
        tiempoRecogidaEstimado: `${tomorrow}T08:00`,
        tiempoEntregaEstimado: `${tomorrow}T12:00`,
      }),
    ];
    expect(
      isRouteEstimadoTimeDisabled(
        "recogida",
        tramos,
        0,
        tomorrow,
        "12:00",
      ),
    ).toBe(true);
    expect(
      isRouteEstimadoTimeDisabled(
        "recogida",
        tramos,
        0,
        tomorrow,
        "11:00",
      ),
    ).toBe(false);
  });

  it("disables entrega time after next tramo recogida on same day", () => {
    const tramos = [
      tramo({
        tiempoRecogidaEstimado: `${tomorrow}T08:00`,
        tiempoEntregaEstimado: `${tomorrow}T10:00`,
      }),
      tramo({
        tiempoRecogidaEstimado: `${tomorrow}T14:00`,
      }),
    ];
    expect(
      isRouteEstimadoTimeDisabled(
        "entrega",
        tramos,
        0,
        tomorrow,
        "15:00",
      ),
    ).toBe(true);
    expect(
      isRouteEstimadoTimeDisabled(
        "entrega",
        tramos,
        0,
        tomorrow,
        "14:00",
      ),
    ).toBe(false);
  });
});
