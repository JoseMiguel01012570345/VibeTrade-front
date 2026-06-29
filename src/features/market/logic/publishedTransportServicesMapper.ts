import type { PublishedTransportServiceDto } from "../Dtos/publishedTransportServicesApiTypes";

export function summarizeTransportServiceForInvite(
  s: PublishedTransportServiceDto,
): string {
  const tipo = (s.tipoServicio ?? "").trim();
  const cat = (s.category ?? "").trim();
  const store = (s.storeName ?? "").trim();
  const core = [tipo, cat].filter(Boolean).join(" · ");
  if (core && store) return `${core} (${store})`;
  if (core) return core;
  if (store) return store;
  return "Servicio de transporte";
}

export function normalizePublishedTransportServicesPayload(
  raw: unknown,
): PublishedTransportServiceDto[] {
  if (!raw || typeof raw !== "object") return [];
  const j = raw as { services?: unknown };
  const arr = j.services;
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    // Backend histórico: { service: {...}, storeName }; contrato actual: ficha plana + storeName.
    if (item && typeof item === "object" && item !== null && "service" in item) {
      const w = item as {
        service?: PublishedTransportServiceDto;
        storeName?: string;
      };
      return {
        ...(w.service ?? {}),
        storeName: w.storeName,
      } as PublishedTransportServiceDto;
    }
    return item as PublishedTransportServiceDto;
  });
}
