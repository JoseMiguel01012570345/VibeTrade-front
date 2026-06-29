import type { RouteSheetCreatePayload } from "./routeSheetTypes";

export type RouteSheetFormPayload = RouteSheetCreatePayload;

export type RouteSheetSubmitResult =
  | { ok: false }
  | { ok: true; routeSheetId: string };
