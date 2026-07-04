import { Fragment } from "react";
import { Check, Truck } from "lucide-react";
import {
  formatEsShort,
  stepStatesForPhase,
  TRACK_STEP_LABELS,
  type StepState,
  type TrackingSuccessModel,
} from "../logic/trackShipmentModel";
import type { OrderDeliveryMode } from "../Dtos/orders";

/** Nodo del hilo de estados: círculo verde (cumplido/actual) o gris (pendiente). */
function TimelineNode({
  state,
  isTransitStep,
}: Readonly<{ state: StepState; isTransitStep: boolean }>) {
  const active = state === "done" || state === "current";
  const showTruck = state === "current" && isTransitStep;
  const Icon = showTruck ? Truck : Check;
  return (
    <span
      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white shadow-[0_8px_18px_rgba(5,150,105,0.28)]"
          : "border-slate-200 bg-white text-slate-300"
      } ${state === "current" ? "ring-4 ring-emerald-100" : ""}`}
      aria-hidden
    >
      {active ? (
        <Icon className="h-5 w-5" />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
      )}
    </span>
  );
}

/**
 * Tarjeta con el resultado del rastreo cuando el pedido existe. Réplica de la
 * `TrackingSuccessCard` de la app de referencia (`reference/frontend-guest/src/pages/
 * TrackShipment.tsx`): badge de estado, llegada estimada, hilo de 4 pasos con fechas y
 * botón para descargar el comprobante.
 */
export function TrackShipmentSuccessCard({
  model,
  deliveryMode,
  onDownloadReceipt,
  pdfLoading,
}: Readonly<{
  model: TrackingSuccessModel;
  deliveryMode: OrderDeliveryMode;
  onDownloadReceipt: () => void;
  pdfLoading: boolean;
}>) {
  const states = stepStatesForPhase(model.phase);
  const transportLabel =
    deliveryMode === "pickup" ? "Recoger en almacén" : "Envío a domicilio";

  return (
    <div className="rounded-[18px] border border-[#e3ddd6] bg-white p-6 shadow-[0_18px_44px_rgba(33,37,41,0.08)] sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800 ring-1 ring-emerald-100">
            {model.badgeLabel}
          </span>
          <p className="mt-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Llegada estimada: {formatEsShort(model.estimatedDelivery)}
          </p>
        </div>
        <div className="hidden items-center gap-2 text-sm font-semibold text-slate-600 sm:flex sm:pt-8">
          <Truck className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden />
          {transportLabel}
        </div>
      </div>

      <div className="mt-10 overflow-x-auto pb-2">
        <div className="flex min-w-[520px] items-start px-1 sm:min-w-0">
          {TRACK_STEP_LABELS.map((def, i) => {
            const state = states[i];
            const segmentGreen = i > 0 && states[i - 1] === "done";
            return (
              <Fragment key={def.title}>
                {i > 0 ? (
                  <div
                    className={`mx-0 mt-[22px] h-1 min-h-[4px] flex-1 rounded-full ${
                      segmentGreen ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                    aria-hidden
                  />
                ) : null}
                <div className="flex w-[22%] max-w-[140px] shrink-0 flex-col items-center text-center">
                  <TimelineNode state={state} isTransitStep={i === 2} />
                  <p
                    className={`mt-3 text-xs font-bold leading-tight sm:text-sm ${
                      state === "pending" ? "text-slate-500" : "text-emerald-800"
                    }`}
                  >
                    {def.title}
                  </p>
                  {state === "pending" && def.pendingSub ? (
                    <p className="mt-1 text-[11px] text-slate-400">
                      {def.pendingSub}
                    </p>
                  ) : null}
                  {state === "done" || state === "current" ? (
                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      {formatEsShort(model.stepDates[i])}
                    </p>
                  ) : null}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-[#efe9e3] pt-6">
        <p className="min-w-0 text-xs leading-relaxed text-slate-500">
          Los hitos reflejan el estado del pedido según nuestro sistema. Puedes
          descargar el comprobante con el desglose de líneas y totales.
        </p>
        <button
          type="button"
          disabled={pdfLoading}
          onClick={onDownloadReceipt}
          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pdfLoading ? "Generando…" : "Descargar comprobante"}
        </button>
      </div>
    </div>
  );
}
