import { ORDER_STATUS_LABELS } from "./proveedorSectionConstants";
import { orderStatusPillClass } from "./proveedorTableHelpers";

export function formatProveedorTxDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function ProveedorOrderStatusBadge({ status }: { status: number }) {
  const normalized = Number(status);
  const safeStatus = Number.isInteger(normalized) && normalized >= 0 ? normalized : 0;
  const label = ORDER_STATUS_LABELS[safeStatus] ?? `Estado ${safeStatus}`;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${orderStatusPillClass(safeStatus)}`}
    >
      {label}
    </span>
  );
}
