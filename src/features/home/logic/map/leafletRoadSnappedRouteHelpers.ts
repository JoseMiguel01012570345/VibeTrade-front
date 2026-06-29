import L from "leaflet";

let lrmLoad: Promise<void> | null = null;

export function ensureLeafletRoutingAttached(): Promise<void> {
  if (!lrmLoad) {
    if (typeof window !== "undefined") {
      (window as unknown as { L: typeof L }).L = L;
    }
    lrmLoad = import("leaflet-routing-machine").then(() => undefined);
  }
  return lrmLoad;
}

export const DEFAULT_LINE_COLOR = "#2563eb";

export function straightStyle(color: string): L.PolylineOptions {
  return { color, weight: 4, opacity: 0.88 };
}

export function lrmLineOptionsFor(main: string) {
  return {
    addWaypoints: false,
    extendToWaypoints: true,
    styles: [
      { color: main, opacity: 0.22, weight: 10 },
      { color: main, opacity: 0.9, weight: 5 },
    ],
  };
}

export function effectiveSegments(
  positions: [number, number][] | undefined,
  segments: [number, number][][] | undefined,
): [number, number][][] {
  const fromSeg = segments?.filter((s) => s.length >= 2) ?? [];
  if (fromSeg.length > 0) return fromSeg;
  if (positions && positions.length >= 2) return [positions];
  return [];
}

export function colorAt(segmentColors: string[] | undefined, i: number): string {
  if (!segmentColors?.length) return DEFAULT_LINE_COLOR;
  return (
    segmentColors[i] ??
    segmentColors[segmentColors.length - 1] ??
    DEFAULT_LINE_COLOR
  );
}
