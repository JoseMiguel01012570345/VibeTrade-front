import { TrackShipmentContent } from "../components/TrackShipmentContent";

/**
 * Buscador de rastreo público global (`/rastreo`). Réplica de la UI/UX del `TrackShipment` de
 * la app de referencia. Cuando se llega desde una tienda se usa la variante con cintillo
 * (`StorefrontTrackingPage`, ruta `{base}/{nombre}/rastreo`); esta versión es el acceso
 * directo sin contexto de tienda.
 */
export function TrackShipmentPage() {
  return (
    <div className="store-front-surface min-h-full bg-[var(--bg)] pb-[96px] text-[var(--text)] sm:pb-[112px]">
      <TrackShipmentContent />
    </div>
  );
}
