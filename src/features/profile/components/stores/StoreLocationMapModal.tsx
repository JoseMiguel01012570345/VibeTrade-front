import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import type { StoreLocationPoint } from "@features/market/logic/store/marketStoreTypes";
import { storeMapPinIcon } from "@features/market/logic/map/storeMapPinIcon";
import { CeButton, CeModal } from "@shared/components/ui";
import { VibeMapTileLayer } from "@features/home/components/EmergentRouteFeedMap";
import {
  STORE_LOCATION_MAP_DEFAULT_CENTER,
  STORE_LOCATION_MAP_ZOOM,
} from "@features/profile/logic/storeMapDefaults";
import "leaflet/dist/leaflet.css";

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
    return STORE_LOCATION_MAP_DEFAULT_CENTER;
  }, [pos]);

  return (
    <CeModal
      show={open}
      onClose={onClose}
      title="Ubicación de la tienda"
      size="lg"
      bodyClassName="overflow-visible max-h-none p-0"
      footer={
        <>
          <CeButton color="gray" outline onClick={onClose}>
            Cancelar
          </CeButton>
          <CeButton
            color="gray"
            outline
            onClick={() => {
              setPos(undefined);
              onSave(undefined);
              onClose();
            }}
          >
            Quitar ubicación
          </CeButton>
          <CeButton
            onClick={() => {
              onSave(pos);
              onClose();
            }}
          >
            Guardar
          </CeButton>
        </>
      }
    >
      <div className="vt-muted mb-3 text-[13px] leading-snug">
        Toca el mapa para colocar el pin. Podés arrastrarlo para ajustar. Es
        opcional y visible para quien visite la tienda.
      </div>
      <div className="store-map-modal-frame overflow-hidden rounded-xl border border-[var(--border)] bg-[#e2e8f0] [&_.leaflet-control-attribution]:text-[10px]">
        <MapContainer
          center={center}
          zoom={STORE_LOCATION_MAP_ZOOM}
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
    </CeModal>
  );
}
