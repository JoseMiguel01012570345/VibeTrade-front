import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, PackageSearch } from "lucide-react";
import { useOrderTracking } from "../hooks/useOrders";
import { formatMoney, statusLabel } from "../logic/formatMoney";

export function OrderReceiptPage() {
  const { publicNumber = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useOrderTracking(publicNumber);

  if (isLoading) {
    return (
      <div className="container vt-page flex items-center justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad text-center">No se encontró el pedido.</div>
      </div>
    );
  }

  return (
    <div className="container vt-page">
      <div className="mx-auto max-w-2xl">
        <div className="vt-card vt-card-pad flex flex-col items-center gap-2 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[color-mix(in_oklab,var(--success,#16a34a)_18%,var(--surface))]">
            <CheckCircle2 size={28} className="text-[var(--success,#16a34a)]" />
          </div>
          <h1 className="vt-h1">¡Compra confirmada!</h1>
          <div className="vt-muted">
            Tu pedido <span className="font-black">{data.publicNumber}</span> está{" "}
            <span className="font-semibold">{statusLabel(data.status)}</span>.
          </div>
        </div>

        <section className="vt-card vt-card-pad mt-4">
          <h2 className="mb-3 font-black tracking-[-0.02em]">Comprobante</h2>
          <div className="flex flex-col gap-2">
            {data.lines.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span>
                  {l.productName}{" "}
                  {l.lineKind === "service" ? (
                    <span className="vt-muted">
                      (servicio
                      {l.recurrenceMonth && l.recurrenceDay
                        ? ` · rec. ${l.recurrenceDay}/${l.recurrenceMonth}`
                        : ""}
                      )
                    </span>
                  ) : null}{" "}
                  <span className="vt-muted">× {l.quantity}</span>
                </span>
                <span>{formatMoney(l.lineTotal, l.currencyCode)}</span>
              </div>
            ))}
            <div className="my-1 h-px bg-[var(--border)]" />
            <div className="flex items-center justify-between text-sm">
              <span className="vt-muted">Subtotal</span>
              <span>{formatMoney(data.subtotal, data.currencyCode)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="vt-muted">Mensajería</span>
              <span>{formatMoney(data.deliveryFee, data.currencyCode)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-black">Total</span>
              <span className="font-black">{formatMoney(data.total, data.currencyCode)}</span>
            </div>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="vt-btn vt-btn-primary"
            onClick={() => navigate(`/rastreo/${encodeURIComponent(data.publicNumber)}`)}
          >
            <PackageSearch size={16} /> Rastrear pedido
          </button>
          <button className="vt-btn" onClick={() => navigate("/mis-compras")}>
            Ver mis compras
          </button>
        </div>
      </div>
    </div>
  );
}
