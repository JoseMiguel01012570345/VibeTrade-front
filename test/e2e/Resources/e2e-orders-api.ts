import type { Page } from "@playwright/test";

/**
 * Helpers de API para los tests e2e nuevos del modelo Pedido y del gate de confianza
 * (checkout, rastreo, mensualidad). Usan el token de sesión inyectado por el auth-fixture.
 * Tests NUEVOS: greening/seeding queda para el plan de seguimiento.
 */

export type CreatedOrder = { orderId: string; publicNumber: string; status: string };

export async function createPickupOrderViaApi(
  page: Page,
  productId: string,
  quantity = 1,
): Promise<CreatedOrder> {
  return page.evaluate(
    async ([pid, qty]: [string, number]) => {
      const token = sessionStorage.getItem("vt_session_token");
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerFirstName: "Cliente",
          customerLastName: "E2E",
          phonePrimary: "+5490000000",
          phoneSecondary: null,
          deliveryMode: "pickup",
          deliveryAddress: null,
          deliveryLatitude: null,
          deliveryLongitude: null,
          paymentMethod: "simulado",
          affiliateCode: null,
          lines: [{ productId: pid, quantity: qty }],
        }),
      });
      if (!res.ok) throw new Error(`orders ${res.status}: ${await res.text()}`);
      return (await res.json()) as { orderId: string; publicNumber: string; status: string };
    },
    [productId, quantity] as [string, number],
  );
}

export type TrustStatus = {
  trustScore: number;
  threshold: number;
  state: string;
  interactionsEnabled: boolean;
  mensualidadRequired: boolean;
};

export async function getTrustStatusViaApi(page: Page): Promise<TrustStatus> {
  return page.evaluate(async () => {
    const token = sessionStorage.getItem("vt_session_token");
    const res = await fetch("/api/v1/me/trust-status", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`trust-status ${res.status}`);
    return (await res.json()) as {
      trustScore: number;
      threshold: number;
      state: string;
      interactionsEnabled: boolean;
      mensualidadRequired: boolean;
    };
  });
}

export async function adjustTrustViaApi(page: Page, delta: number, reason: string): Promise<void> {
  await page.evaluate(
    async ([d, r]: [number, string]) => {
      const token = sessionStorage.getItem("vt_session_token");
      const res = await fetch("/api/v1/me/trust-adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ delta: d, reason: r }),
      });
      if (!res.ok) throw new Error(`trust-adjust ${res.status}`);
    },
    [delta, reason] as [number, string],
  );
}
