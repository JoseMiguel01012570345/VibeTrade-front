import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { useTrustGate, usePayMensualidad } from "../hooks/useTrustGate";

export function MensualidadPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTrustGate();
  const pay = usePayMensualidad();

  const blocked = data?.mensualidadRequired ?? false;

  async function handlePay() {
    try {
      const res = await pay.mutateAsync({ paymentMethod: "simulado" });
      if (res.crossedThresholdUp) {
        toast.success("Mensualidad pagada. Interacciones rehabilitadas.");
      } else {
        toast.success("Mensualidad registrada.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo procesar el pago.");
    }
  }

  return (
    <div className="container vt-page">
      <div className="flex items-center gap-2">
        {blocked ? <ShieldAlert className="text-[var(--bad)]" /> : <ShieldCheck className="text-[var(--good)]" />}
        <h1 className="vt-h1">Mensualidad</h1>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <CeSpinner />
        </div>
      )}
      {isError && (
        <div className="vt-card vt-card-pad mt-4 text-center">No se pudo cargar tu estado de confianza.</div>
      )}

      {!isLoading && !isError && data && (
        <section className="vt-card vt-card-pad mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="vt-muted text-xs">Tu puntaje</div>
              <div className="text-2xl font-black">{data.trustScore}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="vt-muted text-xs">Umbral</div>
              <div className="text-2xl font-black">{data.threshold}</div>
            </div>
          </div>

          {blocked ? (
            <div className="rounded-xl border border-[color-mix(in_oklab,var(--bad)_40%,var(--border))] bg-[color-mix(in_oklab,var(--bad)_8%,transparent)] p-3 text-sm">
              Tu puntaje está por debajo del umbral: las interacciones están bloqueadas. Paga tu
              mensualidad para recuperar el acceso.
            </div>
          ) : (
            <div className="rounded-xl border border-[color-mix(in_oklab,var(--good)_40%,var(--border))] bg-[color-mix(in_oklab,var(--good)_8%,transparent)] p-3 text-sm">
              Tu cuenta está activa. Puedes usar la plataforma con normalidad.
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="vt-btn vt-btn-primary"
              disabled={pay.isPending}
              onClick={handlePay}
            >
              {pay.isPending ? "Procesando…" : blocked ? "Pagar mensualidad" : "Pagar mensualidad igualmente"}
            </button>
            <button type="button" className="vt-btn" onClick={() => navigate(-1)}>
              Volver
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
