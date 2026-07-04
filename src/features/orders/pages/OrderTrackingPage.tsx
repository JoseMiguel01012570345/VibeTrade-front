import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useOrderTracking } from "../hooks/useOrders";
import { useEvidenceDecision } from "../logic/orderTracking";
import { formatMoney, paymentStatusLabel, statusLabel } from "../logic/formatMoney";
import { OrderStatusStepper } from "../components/OrderStatusStepper";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";

export function OrderTrackingPage() {
  const { publicNumber = "" } = useParams();
  const { data, isLoading, isError } = useOrderTracking(publicNumber);
  const evidence = useEvidenceDecision(publicNumber);

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

  const pendingEvidence = data.clientEvidenceDecision === "pending";

  return (
    <div className="container vt-page">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="vt-h1">Rastreo</h1>
            <div className="vt-muted">
              Pedido <span className="font-black">{data.publicNumber}</span>
            </div>
          </div>
          <span className="rounded-full border border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_18%,var(--surface))] px-3 py-1 text-sm font-semibold">
            {statusLabel(data.status)}
          </span>
        </div>

        <OrderStatusStepper status={data.status} />

        <section className="vt-card vt-card-pad mt-4">
          <h2 className="mb-2 font-black tracking-[-0.02em]">Pago</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="vt-muted">Estado del pago</span>
            <span>{paymentStatusLabel(data.paymentStatus)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-black">Total</span>
            <span className="font-black">{formatMoney(data.total, data.currencyCode)}</span>
          </div>
        </section>

        {(pendingEvidence || data.clientEvidenceUrls.length > 0) && (
          <section className="vt-card vt-card-pad mt-4">
            <h2 className="mb-2 font-black tracking-[-0.02em]">Evidencia de entrega</h2>
            {data.clientEvidenceNote && (
              <p className="vt-muted mb-2 text-sm">{data.clientEvidenceNote}</p>
            )}
            {data.clientEvidenceUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {data.clientEvidenceUrls.map((u) => (
                  <ProtectedMediaImg
                    key={u}
                    src={u}
                    alt="Evidencia"
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            )}

            {pendingEvidence ? (
              <div className="mt-3 flex flex-col gap-2">
                <p className="vt-muted text-sm">
                  Revisa la evidencia. Al aceptar, se libera el pago al vendedor.
                </p>
                <input
                  className="vt-input"
                  placeholder="Motivo del rechazo (opcional)"
                  value={evidence.rejectReason}
                  onChange={(e) => evidence.setRejectReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="vt-btn vt-btn-primary"
                    onClick={() => evidence.submit(data.id, true)}
                    disabled={evidence.isPending}
                  >
                    <CheckCircle2 size={16} /> Aceptar entrega
                  </button>
                  <button
                    className="vt-btn"
                    onClick={() => evidence.submit(data.id, false)}
                    disabled={evidence.isPending}
                  >
                    <XCircle size={16} /> Rechazar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm">
                {data.clientEvidenceDecision === "accepted" && (
                  <span className="text-[var(--success,#16a34a)]">Entrega aceptada.</span>
                )}
                {data.clientEvidenceDecision === "rejected" && (
                  <span className="text-[var(--danger,#dc2626)]">Evidencia rechazada.</span>
                )}
              </div>
            )}
          </section>
        )}

        <section className="vt-card vt-card-pad mt-4">
          <h2 className="mb-2 font-black tracking-[-0.02em]">Detalle</h2>
          <div className="flex flex-col gap-2">
            {data.lines.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span>
                  {l.productName} <span className="vt-muted">× {l.quantity}</span>
                </span>
                <span>{formatMoney(l.lineTotal, l.currencyCode)}</span>
              </div>
            ))}
          </div>
          <div className="vt-muted mt-3 text-sm">Entrega: {data.deliveryAddress || "Recoger en almacén"}</div>
        </section>
      </div>
    </div>
  );
}
