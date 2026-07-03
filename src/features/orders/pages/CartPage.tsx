import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { cartSubtotal, useCartStore } from "../logic/cartStore";
import { formatMoney } from "../logic/formatMoney";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";

export function CartPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const currency = items[0]?.currencyCode ?? "";
  const totalUnits = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  if (items.length === 0) {
    return (
      <div className="container vt-page">
        <h1 className="vt-h1">Carrito</h1>
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
      <h1 className="vt-h1">Carrito</h1>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="vt-card vt-card-pad">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black tracking-[-0.02em]">
              Productos ({totalUnits})
            </h2>
            <button
              className="vt-btn vt-btn-sm"
              onClick={clear}
              aria-label="Vaciar carrito"
            >
              Vaciar
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {items.map((i) => (
              <div
                key={i.productId}
                className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"
              >
                <div className="h-14 w-14 overflow-hidden rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_75%,var(--surface))]">
                  {i.photoUrl ? (
                    <ProtectedMediaImg
                      src={i.photoUrl}
                      alt={i.name}
                      wrapperClassName="h-14 w-14"
                      className="h-14 w-14 object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[var(--muted)]">
                      <ShoppingBag size={18} aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{i.name}</div>
                  <div className="vt-muted text-sm">
                    {formatMoney(i.unitPrice, i.currencyCode)} c/u
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="vt-btn vt-btn-sm"
                    aria-label="Disminuir cantidad"
                    onClick={() => setQuantity(i.productId, i.quantity - 1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center tabular-nums font-semibold">
                    {i.quantity}
                  </span>
                  <button
                    className="vt-btn vt-btn-sm"
                    aria-label="Aumentar cantidad"
                    onClick={() => setQuantity(i.productId, i.quantity + 1)}
                  >
                    <Plus size={14} />
                  </button>
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

        <aside className="vt-card vt-card-pad h-fit lg:sticky lg:top-20">
          <h2 className="mb-3 font-black tracking-[-0.02em]">Resumen</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="vt-muted">Subtotal</span>
            <span className="font-black">{formatMoney(subtotal, currency)}</span>
          </div>
          <p className="vt-muted mt-3 text-xs">
            La mensajería y el total final se calculan en el siguiente paso según
            la dirección de entrega.
          </p>
          <button
            className="vt-btn vt-btn-primary mt-4 inline-flex w-full items-center justify-center gap-2"
            onClick={() => navigate("/checkout")}
          >
            <ShoppingCart size={16} aria-hidden /> Proceder al pago
          </button>
          <button
            className="vt-btn mt-2 w-full"
            onClick={() => navigate("/search")}
          >
            Seguir comprando
          </button>
        </aside>
      </div>
    </div>
  );
}
