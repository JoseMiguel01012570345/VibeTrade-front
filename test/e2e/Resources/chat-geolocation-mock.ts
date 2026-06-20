import type { BrowserContext, Page } from "@playwright/test";

export type GeolocationMockCoords = { latitude: number; longitude: number };

/** Stub navigator.geolocation so CarrierTelemetryBridge can POST samples in Playwright. */
export async function installGeolocationMock(
  target: Page | BrowserContext,
  coords: GeolocationMockCoords,
): Promise<void> {
  const context = "context" in target ? target.context() : target;
  await context.addInitScript(
    ([lat, lng]: [number, number]) => {
      if ((window as unknown as { __vtGeoMock?: boolean }).__vtGeoMock) return;
      (window as unknown as { __vtGeoMock?: boolean }).__vtGeoMock = true;

      const watches = new Map<number, PositionCallback>();
      let watchSeq = 1;

      const makePosition = (): GeolocationPosition =>
        ({
          coords: {
            latitude: lat,
            longitude: lng,
            accuracy: 5,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        }) as GeolocationPosition;

      const emitAll = () => {
        for (const cb of watches.values()) {
          try {
            cb(makePosition());
          } catch {
            /* ignore */
          }
        }
      };

      (window as unknown as { __vtEmitGeolocation?: () => void }).__vtEmitGeolocation =
        emitAll;

      navigator.geolocation.getCurrentPosition = (success, _err, _opts) => {
        if (success) success(makePosition());
      };

      navigator.geolocation.watchPosition = (success) => {
        const id = watchSeq++;
        if (success) {
          watches.set(id, success);
          success(makePosition());
        }
        return id;
      };

      navigator.geolocation.clearWatch = (id: number) => {
        watches.delete(id);
      };
    },
    [coords.latitude, coords.longitude] as [number, number],
  );
}

/** Nudge mocked watchPosition subscribers (e.g. after navigation). */
export async function pulseGeolocationMock(page: Page): Promise<void> {
  await page.evaluate(() => {
    const fn = (window as unknown as { __vtEmitGeolocation?: () => void })
      .__vtEmitGeolocation;
    fn?.();
  });
}
