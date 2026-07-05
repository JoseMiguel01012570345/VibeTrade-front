import { useEffect, useId, useMemo, useState } from "react";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import { toast } from "sonner";
import { MapPin, X } from "lucide-react";
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
import type { OrderDeliveryMode } from "../Dtos/orders";
import type { DeliveryFormData } from "../logic/checkoutForm";
import "leaflet/dist/leaflet.css";

/** Réplica del `DeliveryDataModal` de la referencia (frontend-guest), adaptada al
 *  modelo de VibeTrade: para "recogida" solo pide contacto; para "envío" añade
 *  dirección + pin en el mapa (reusa el tile layer y el pin de la app). */
function StepBadge({ n }: Readonly<{ n: number }>) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-extrabold text-emerald-800">
      {n}
    </span>
  );
}

const inputClass =
  "h-11 w-full rounded-[10px] border border-[#e2dcd4] bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

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
      <span className="mb-1 block text-xs font-bold text-slate-700">
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
    >
      <div className="flex items-center gap-3 border-b border-[#efe9e3] px-5 py-4 sm:px-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
          <MapPin className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            className="text-lg font-extrabold tracking-tight text-slate-900"
          >
            Datos de entrega
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {needsAddress
              ? "Tus datos y el punto exacto de entrega"
              : "Tus datos de contacto para la recogida"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <section>
            <div className="flex items-center gap-3">
              <StepBadge n={1} />
              <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
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
            <section className="mt-6 rounded-[14px] border border-[#e8e1da] bg-[#fafaf9] p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <StepBadge n={2} />
                <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
                  Marca tu ubicación
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Toca el mapa para colocar el pin en tu punto de entrega. Puedes
                arrastrarlo para ajustar.
              </p>
              <div className="mt-4 overflow-hidden rounded-[10px] border border-[#e8e1da] bg-[#e2e8f0]">
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
              <p className="mt-3 text-xs text-slate-500">
                <span className="font-semibold text-emerald-800">Pin:</span>{" "}
                {pinPlaced && lat != null && lng != null
                  ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                  : "Toca el mapa para colocar el pin"}
              </p>
            </section>
          ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-[#efe9e3] px-5 py-4 sm:flex-row sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-[10px] border border-[#ddd5ce] bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-stone-50 sm:flex-1"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full rounded-[10px] bg-emerald-700 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(4,120,87,0.25)] transition hover:bg-emerald-800 sm:flex-[2]"
        >
          Guardar datos de entrega
        </button>
      </div>
    </CeFlowbiteModal>
  );
}
