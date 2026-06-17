import { describe, expect, test } from "vitest";
import type { RouteSheetCreatePayload, RouteTramoFormInput } from "@features/market/model/routeSheetTypes";
import {
  getRouteSheetFormErrors,
  hasRouteSheetFormErrors,
  tramoLinkErrorMessage,
} from "@features/market/model/routeSheetValidation";

function futureIsoLocal(hoursFromNow = 48): string {
  const d = new Date(Date.now() + hoursFromNow * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function minimalTramo(overrides: Partial<RouteTramoFormInput> = {}): RouteTramoFormInput {
  const rec = futureIsoLocal(48);
  const ent = futureIsoLocal(72);
  return {
    origen: "Punto A",
    destino: "Punto B",
    origenLat: "1",
    origenLng: "2",
    destinoLat: "3",
    destinoLng: "4",
    tiempoRecogidaEstimado: rec,
    tiempoEntregaEstimado: ent,
    precioTransportista: "100",
    cargaEnTramo: "Carga general de prueba",
    tipoMercanciaCarga: "General",
    tipoMercanciaDescarga: "General",
    notas: "Notas del tramo de prueba",
    responsabilidadEmbalaje: "Vendedor responsable",
    requisitosEspeciales: "Sin requisitos",
    tipoVehiculoRequerido: "Camión",
    monedaPago: "USD",
    ...overrides,
  };
}

function minimalLinkedRouteSheetPayload(
  paradas: RouteTramoFormInput[],
): RouteSheetCreatePayload {
  return {
    titulo: "Hoja de prueba",
    mercanciasResumen: "Mercancía de prueba en ruta",
    notasGenerales: "Notas generales de prueba",
    paradas,
  };
}

describe("getRouteSheetFormErrors — cadena única de tramos", () => {
  test("rejects disconnected tramos", () => {
    const payload = minimalLinkedRouteSheetPayload([
      minimalTramo({
        origenLat: "1",
        origenLng: "2",
        destinoLat: "3",
        destinoLng: "4",
      }),
      minimalTramo({
        origen: "Punto X",
        destino: "Punto Y",
        origenLat: "9",
        origenLng: "9",
        destinoLat: "8",
        destinoLng: "8",
      }),
    ]);

    const errors = getRouteSheetFormErrors(payload);
    expect(hasRouteSheetFormErrors(errors)).toBe(true);
    expect(errors.tramos?.[1]?.coordOrigen).toBe(tramoLinkErrorMessage(2));
  });

  test("accepts linked tramos", () => {
    const rec1 = futureIsoLocal(48);
    const ent1 = futureIsoLocal(72);
    const rec2 = ent1;
    const ent2 = futureIsoLocal(96);
    const payload = minimalLinkedRouteSheetPayload([
      minimalTramo({
        origenLat: "1",
        origenLng: "2",
        destinoLat: "3",
        destinoLng: "4",
        tiempoRecogidaEstimado: rec1,
        tiempoEntregaEstimado: ent1,
      }),
      minimalTramo({
        origen: "Punto B",
        destino: "Punto C",
        origenLat: "3",
        origenLng: "4",
        destinoLat: "5",
        destinoLng: "6",
        tiempoRecogidaEstimado: rec2,
        tiempoEntregaEstimado: ent2,
      }),
    ]);

    const errors = getRouteSheetFormErrors(payload);
    expect(errors.tramos?.[1]?.coordOrigen).toBeUndefined();
    expect(hasRouteSheetFormErrors(errors)).toBe(false);
  });
});
