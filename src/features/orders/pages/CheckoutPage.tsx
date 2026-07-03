import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, MapPin, ShoppingBag, Trash2 } from "lucide-react";
import { cartSubtotal, useCartStore } from "../logic/cartStore";
import { useCheckoutPreview, useCreateOrder } from "../hooks/useOrders";
import { formatMoney } from "../logic/formatMoney";
import type { CreateOrderRequest, OrderDeliveryMode } from "../Dtos/orders";
import { errorToUserMessage } from "@shared/services/http/apiErrorMessage";

export function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [mode, setMode] = useState<OrderDeliveryMode>("shipping");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const preview = useCheckoutPreview();
  const create = useCreateOrder();

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const currency = items[0]?.currencyCode ?? "";

  function buildRequest(): CreateOrderRequest {
    return {
      customerFirstName: firstName.trim(),
      customerLastName: lastName.trim(),
      phonePrimary: phone.trim(),
      phoneSecondary: phone2.trim() || null,
      deliveryMode: mode,
      deliveryAddress: address.trim() || null,
      deliveryLatitude: lat.trim() ? Number(lat) : null,
      deliveryLongitude: lng.trim() ? Number(lng) : null,
      paymentMethod: "platform",
      affiliateCode: null,
      lines: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    };
  }

  async function onPreview() {
    if (items.length === 0) return;
    try {
      await preview.mutateAsync(buildRequest());
    } catch (e) {
      toast.error(errorToUserMessage(e, "No se pudo calcular el total."));
    }
  }

  async function onConfirm() {
    if (items.length === 0) {
      toast.error("Tu carrito está vacío.");
      return;
    }
    if (!firstName.trim() || !phone.trim()) {
      toast.error("Indica al menos nombre y teléfono.");
      return;
    }
    try {
      const res = await create.mutateAsync(buildRequest());
      clear();
      toast.success(`Pedido ${res.publicNumber} creado.`);
      navigate(`/pedido/${encodeURIComponent(res.publicNumber)}`);
    } catch (e) {
      toast.error(errorToUserMessage(e, "No se pudo crear el pedido."));
    }
  }

  const total = preview.data?.total ?? subtotal;
  const deliveryFee = preview.data?.deliveryFee ?? 0;

  if (items.length === 0) {
    return (
      <div className="container vt-page">
        <h1 className="vt-h1">Finalizar compra</h1>
        <div className="vt-card vt-card-pad mt-4 flex flex-col items-center gap-3 text-center">
          <ShoppingBag size={40} className="opacity-60" />
          <div className="vt-muted">Tu carrito está vacío.</div>
          <button className="vt-btn" onClick={() => navigate("/search")}>
            Explorar el catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container vt-page">
      <h1 className="vt-h1">Finalizar compra</h1>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <section className="vt-card vt-card-pad">
            <h2 className="mb-3 font-black tracking-[-0.02em]">Productos</h2>
            <div className="flex flex-col gap-3">
              {items.map((i) => (
                <div
                  key={i.productId}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="font-semibold">{i.name}</div>
                    <div className="vt-muted text-sm">
                      {formatMoney(i.unitPrice, i.currencyCode)} c/u
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={i.quantity}
                      onChange={(e) => setQuantity(i.productId, Number(e.target.value))}
                      className="vt-input w-16 text-center"
                    />
                    <button
                      className="vt-btn vt-btn-sm"
                      aria-label="Quitar"
                      onClick={() => removeItem(i.productId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="vt-card vt-card-pad">
            <h2 className="mb-3 font-black tracking-[-0.02em]">Datos de entrega</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm vt-muted">Nombre</span>
                <input className="vt-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm vt-muted">Apellidos</span>
                <input className="vt-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm vt-muted">Teléfono</span>
                <input className="vt-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm vt-muted">Teléfono alternativo</span>
                <input className="vt-input" value={phone2} onChange={(e) => setPhone2(e.target.value)} />
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              {(["shipping", "pickup"] as OrderDeliveryMode[]).map((m) => (
                <button
                  key={m}
                  className={`vt-btn ${mode === m ? "vt-btn-primary" : ""}`}
                  onClick={() => setMode(m)}
                >
                  {m === "shipping" ? "Envío a domicilio" : "Recoger en almacén"}
                </button>
              ))}
            </div>

            {mode === "shipping" && (
              <div className="mt-3 grid gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm vt-muted">Dirección</span>
                  <input className="vt-input" value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-sm vt-muted">
                      <MapPin size={14} /> Latitud
                    </span>
                    <input className="vt-input" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="23.1136" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-sm vt-muted">
                      <MapPin size={14} /> Longitud
                    </span>
                    <input className="vt-input" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-82.3666" />
                  </label>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="vt-card vt-card-pad h-fit lg:sticky lg:top-20">
          <h2 className="mb-3 font-black tracking-[-0.02em]">Resumen</h2>
          <div className="flex flex-col gap-2 text-sm">
            <Row label="Subtotal" value={formatMoney(subtotal, currency)} />
            <Row
              label="Mensajería"
              value={mode === "pickup" ? "—" : formatMoney(deliveryFee, currency)}
            />
            {preview.data?.routeDistanceKm != null && (
              <Row label="Distancia" value={`${preview.data.routeDistanceKm.toFixed(1)} km`} />
            )}
            <div className="my-1 h-px bg-[var(--border)]" />
            <Row label="Total" value={formatMoney(total, currency)} strong />
          </div>

          <p className="vt-muted mt-3 text-xs">
            El pago se retiene como garantía y se libera al vendedor cuando confirmes la entrega.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button className="vt-btn" onClick={onPreview} disabled={preview.isPending}>
              {preview.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Calcular total
            </button>
            <button className="vt-btn vt-btn-primary" onClick={onConfirm} disabled={create.isPending}>
              {create.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Confirmar y pagar
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-black" : "vt-muted"}>{label}</span>
      <span className={strong ? "font-black" : ""}>{value}</span>
    </div>
  );
}
