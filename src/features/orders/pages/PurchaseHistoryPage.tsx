import { useNavigate } from "react-router-dom";
import { PackageSearch, ShoppingBag } from "lucide-react";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { useMyOrders } from "../hooks/useOrders";
import { formatMoney, statusLabel } from "../logic/formatMoney";

export function PurchaseHistoryPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMyOrders();

  return (
    <div className="container vt-page">
      <h1 className="vt-h1">Mis compras</h1>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <CeSpinner />
        </div>
      )}

      {isError && (
        <div className="vt-card vt-card-pad mt-4 text-center">No se pudo cargar tu historial.</div>
      )}

      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <div className="vt-card vt-card-pad mt-4 flex flex-col items-center gap-3 text-center">
          <ShoppingBag size={40} className="opacity-60" />
          <div className="vt-muted">Todavía no realizaste compras.</div>
          <button className="vt-btn" onClick={() => navigate("/search")}>
            Explorar el catálogo
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {(data ?? []).map((o) => (
          <button
            key={o.id}
            className="vt-card vt-card-pad flex items-center justify-between gap-3 text-left transition hover:border-[var(--primary)]"
            onClick={() => navigate(`/pedido/${encodeURIComponent(o.publicNumber)}`)}
          >
            <div>
              <div className="font-black tracking-[-0.02em]">{o.publicNumber}</div>
              <div className="vt-muted text-sm">
                {new Date(o.createdAtUtc).toLocaleDateString()} · {statusLabel(o.status)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">{formatMoney(o.total, o.currencyCode)}</span>
              <PackageSearch size={18} className="opacity-60" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
