import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import type { StoreLocationPoint } from "../../../app/store/marketStoreTypes";
import { storeMapPinIcon } from "../../../utils/map/storeMapPinIcon";
import { onBackdropPointerClose } from "../../chat/lib/modalClose";
import { modalShellWide } from "../../chat/styles/formModalStyles";
import { VibeMapTileLayer } from "../../home/EmergentRouteFeedMap";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [22.526838, -81.128701];
const ZOOM = 14;

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type Props = Readonly<{
  open: boolean;
  initial: StoreLocationPoint | undefined;
  onClose: () => void;
  /** `undefined` = sin ubicación (quitar pin). */
  onSave: (p: StoreLocationPoint | undefined) => void;
}>;

export function StoreLocationMapModal({
  open,
  initial,
  onClose,
  onSave,
}: Props) {
  const [pos, setPos] = useState<StoreLocationPoint | undefined>(initial);

  useEffect(() => {
    if (open) setPos(initial);
  }, [open, initial?.lat, initial?.lng]);

  const center = useMemo((): [number, number] => {
    if (pos) return [pos.lat, pos.lng];
    return DEFAULT_CENTER;
  }, [pos]);

  if (!open) return null;

  return (
    <div
      className="vt-modal-backdrop z-[80]"
      role="dialog"
      aria-modal="true"
      aria-label="Elegir ubicación en el mapa"
      onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
    >
      <div
        className={`${modalShellWide} max-w-[560px]`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="vt-modal-title">Ubicación de la tienda</div>
        <div className="vt-muted mb-3 text-[13px] leading-snug">
          Tocá el mapa para colocar el pin. Podés arrastrarlo para ajustar. Es
          opcional y visible para quien visite la tienda.
        </div>
        <div className="store-map-modal-frame overflow-hidden rounded-xl border border-[var(--border)] bg-[#e2e8f0] [&_.leaflet-control-attribution]:text-[10px]">
          <MapContainer
            center={center}
            zoom={ZOOM}
            className="h-[min(52vh,360px)] w-full"
            scrollWheelZoom
            attributionControl
          >
            <VibeMapTileLayer />
            <MapClickHandler onPick={(lat, lng) => setPos({ lat, lng })} />
            {pos ? (
              <Marker
                position={[pos.lat, pos.lng]}
                draggable
                icon={storeMapPinIcon()}
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target;
                    const ll = m.getLatLng();
                    setPos({ lat: ll.lat, lng: ll.lng });
                  },
                }}
              />
            ) : null}
          </MapContainer>
        </div>
        <div className="vt-modal-actions mt-4 flex-wrap">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-ghost"
            onClick={() => {
              setPos(undefined);
              onSave(undefined);
              onClose();
            }}
          >
            Quitar ubicación
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={() => {
              onSave(pos);
              onClose();
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
