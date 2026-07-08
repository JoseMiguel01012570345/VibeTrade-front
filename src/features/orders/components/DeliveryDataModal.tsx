import { useEffect, useId, useMemo, useState } from "react";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import { toast } from "sonner";
import { MapPin, X } from "lucide-react";
import { ProfileButton } from "@features/profile/components/ProfileButton";
import { CeFlowbiteModal } from "@shared/components/ui";
import { VibeMapTileLayer } from "@features/home/components/EmergentRouteFeedMap";
import { storeMapPinIcon } from "@features/market/logic/map/storeMapPinIcon";
import {
  STORE_LOCATION_MAP_DEFAULT_CENTER,
  STORE_LOCATION_MAP_ZOOM,
} from "@features/profile/logic/storeMapDefaults";
import {
  STOREFRONT_CHECKOUT_MODAL_THEME,
  STOREFRONT_MODAL_BACKDROP,
} from "@features/storefront/lib/storefrontModalTheme";
import {
  useStorefrontAmbient,
  storefrontAmbientPortalProps,
} from "@features/storefront/context/StorefrontAmbientContext";
import { cn } from "@shared/lib/cn";
import type { OrderDeliveryMode } from "../Dtos/orders";
import type { DeliveryFormData } from "../logic/checkoutForm";
import "leaflet/dist/leaflet.css";

/** Réplica del `DeliveryDataModal` de la referencia (frontend-guest), adaptada al
 *  modelo de VibeTrade: para "recogida" solo pide contacto; para "envío" añade
 *  dirección + pin en el mapa (reusa el tile layer y el pin de la app). */
function StepBadge({ n }: Readonly<{ n: number }>) {
  return (
    <span className="vt-storefront-step-badge flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold">
      {n}
    </span>
  );
}

const inputClass =
  "vt-storefront-input h-11 w-full rounded-[10px] border px-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:ring-4";

function LabeledInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}>) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-xs font-bold text-[var(--muted)]">
        {label}
      </span>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function MapClickHandler({
  onPick,
}: Readonly<{ onPick: (lat: number, lng: number) => void }>) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function DeliveryDataModal({
  open,
  mode,
  initial,
  onClose,
  onConfirm,
}: Readonly<{
  open: boolean;
  mode: OrderDeliveryMode;
  initial: DeliveryFormData;
  onClose: () => void;
  onConfirm: (data: DeliveryFormData) => void;
}>) {
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [pinPlaced, setPinPlaced] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const titleId = useId();
  const ambient = useStorefrontAmbient();
  const portalAmbient = storefrontAmbientPortalProps(ambient);

  const needsAddress = mode === "shipping";

  useEffect(() => {
    if (!open) return;
    setFullName(initial.fullName);
    setAddress(initial.address);
    setCity(initial.city);
    setPhone(initial.phone);
    setPhone2(initial.phone2);
    setPinPlaced(initial.pinPlaced);
    setLat(initial.pinPlaced ? initial.latitude : null);
    setLng(initial.pinPlaced ? initial.longitude : null);
  }, [open, initial]);

  const center = useMemo((): [number, number] => {
    if (pinPlaced && lat != null && lng != null) return [lat, lng];
    return STORE_LOCATION_MAP_DEFAULT_CENTER;
  }, [pinPlaced, lat, lng]);

  function handleConfirm() {
    if (!fullName.trim()) {
      toast.error("Indica tu nombre completo.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Indica un teléfono de contacto.");
      return;
    }
    if (needsAddress) {
      if (!address.trim()) {
        toast.error("Indica la dirección de entrega.");
        return;
      }
      if (!city.trim()) {
        toast.error("Indica la ciudad.");
        return;
      }
      if (!pinPlaced || lat == null || lng == null) {
        toast.error("Coloca el pin en el mapa en el punto exacto de entrega.");
        return;
      }
    }
    onConfirm({
      fullName: fullName.trim(),
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      phone2: phone2.trim(),
      latitude: lat,
      longitude: lng,
      pinPlaced: needsAddress ? pinPlaced : false,
    });
  }

  return (
    <CeFlowbiteModal
      show={open}
      onClose={onClose}
      size="2xl"
      theme={STOREFRONT_CHECKOUT_MODAL_THEME}
      backdropClassName={STOREFRONT_MODAL_BACKDROP}
      panelClassName={cn("vt-storefront-modal store-front-surface", portalAmbient.className)}
      panelStyle={portalAmbient.style}
    >
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <span className="vt-storefront-accent-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white">
          <MapPin className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            className="text-lg font-extrabold tracking-tight text-[var(--text)]"
          >
            Datos de entrega
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {needsAddress
              ? "Tus datos y el punto exacto de entrega"
              : "Tus datos de contacto para la recogida"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] hover:text-[var(--text)]"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <section>
            <div className="flex items-center gap-3">
              <StepBadge n={1} />
              <h3 className="text-sm font-extrabold tracking-tight text-[var(--text)]">
                Confirma tus datos de contacto
              </h3>
            </div>
            <div className="mt-5 space-y-4">
              <LabeledInput
                id="delivery-fullName"
                label="Nombre completo"
                autoComplete="name"
                value={fullName}
                onChange={setFullName}
                placeholder="Nombre y apellidos"
              />
              {needsAddress ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <LabeledInput
                    id="delivery-address"
                    label="Dirección"
                    autoComplete="street-address"
                    value={address}
                    onChange={setAddress}
                    placeholder="Calle, número, referencia"
                  />
                  <LabeledInput
                    id="delivery-city"
                    label="Ciudad"
                    autoComplete="address-level2"
                    value={city}
                    onChange={setCity}
                    placeholder="Ciudad"
                  />
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <LabeledInput
                  id="delivery-phone"
                  label="Teléfono principal"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+53 5 1234567"
                />
                <LabeledInput
                  id="delivery-phone2"
                  label="Teléfono extra"
                  type="tel"
                  autoComplete="tel"
                  value={phone2}
                  onChange={setPhone2}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </section>

          {needsAddress ? (
            <section className="vt-storefront-section-panel mt-6 rounded-[14px] border p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <StepBadge n={2} />
                <h3 className="text-sm font-extrabold tracking-tight text-[var(--text)]">
                  Marca tu ubicación
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Toca el mapa para colocar el pin en tu punto de entrega. Puedes
                arrastrarlo para ajustar.
              </p>
              <div className="mt-4 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]">
                <MapContainer
                  center={center}
                  zoom={STORE_LOCATION_MAP_ZOOM}
                  className="h-[min(40vh,300px)] w-full"
                  scrollWheelZoom
                >
                  <VibeMapTileLayer />
                  <MapClickHandler
                    onPick={(la, lo) => {
                      setLat(la);
                      setLng(lo);
                      setPinPlaced(true);
                    }}
                  />
                  {pinPlaced && lat != null && lng != null ? (
                    <Marker
                      position={[lat, lng]}
                      draggable
                      icon={storeMapPinIcon()}
                      eventHandlers={{
                        dragend: (e) => {
                          const ll = e.target.getLatLng();
                          setLat(ll.lat);
                          setLng(ll.lng);
                        },
                      }}
                    />
                  ) : null}
                </MapContainer>
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">
                <span className="font-semibold text-[var(--primary)]">Pin:</span>{" "}
                {pinPlaced && lat != null && lng != null
                  ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                  : "Toca el mapa para colocar el pin"}
              </p>
            </section>
          ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:px-6">
        <ProfileButton variant="ghost" onClick={onClose} className="w-full sm:flex-1">
          Cancelar
        </ProfileButton>
        <ProfileButton variant="primary" onClick={handleConfirm} className="w-full sm:flex-[2]">
          Guardar datos de entrega
        </ProfileButton>
      </div>
    </CeFlowbiteModal>
  );
}
