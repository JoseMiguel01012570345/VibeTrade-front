import { TrackShipmentContent } from "../components/TrackShipmentContent";

/**
 * Buscador de rastreo público global (`/rastreo`). Réplica de la UI/UX del `TrackShipment` de
 * la app de referencia. Cuando se llega desde una tienda se usa la variante con cintillo
 * (`StorefrontTrackingPage`, ruta `{base}/{nombre}/rastreo`); esta versión es el acceso
 * directo sin contexto de tienda.
 */
export function TrackShipmentPage() {
  return (
    <div className="store-front-surface min-h-full bg-[#f7f3ef] pb-[96px] text-slate-900 sm:pb-[112px]">
      <TrackShipmentContent />
    </div>
  );
}
