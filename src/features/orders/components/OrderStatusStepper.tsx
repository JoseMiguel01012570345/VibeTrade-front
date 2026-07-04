import { Truck } from "lucide-react";
import { ORDER_TRACKING_STEPS, orderStepIndex } from "../logic/orderTracking";
import type { OrderStatus } from "../Dtos/orders";

/** Línea de progreso del pedido (procesado → en tránsito → entregado). */
export function OrderStatusStepper({ status }: Readonly<{ status: OrderStatus }>) {
  const current = orderStepIndex(status);
  return (
    <section className="vt-card vt-card-pad mt-4">
      <div className="flex items-center justify-between">
        {ORDER_TRACKING_STEPS.map((s, i) => (
          <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`grid h-9 w-9 place-items-center rounded-full border ${
                i <= current
                  ? "border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_18%,var(--surface))]"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <Truck size={16} />
            </div>
            <span className={`text-xs ${i <= current ? "font-semibold" : "vt-muted"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
