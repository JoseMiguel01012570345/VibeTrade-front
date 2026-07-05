import { Link2, Eye, ShoppingCart } from "lucide-react";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { formatMoney } from "@features/orders";
import { useMyAffiliateDashboards } from "../hooks/useFinance";

function commissionLabel(kind: string, value: number, currency: string | null): string {
  if (kind === "percent") return `${value}%`;
  if (kind === "fixed") return formatMoney(value, currency ?? "USD");
  return `${value}`;
}

export function AffiliateDashboardPage() {
  const { data, isLoading, isError } = useMyAffiliateDashboards();

  return (
    <div className="container vt-page">
      <div className="flex items-center gap-2">
        <Link2 />
        <h1 className="vt-h1">Panel de afiliado</h1>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <CeSpinner />
        </div>
      )}
      {isError && (
        <div className="vt-card vt-card-pad mt-4 text-center">No se pudo cargar tu panel.</div>
      )}

      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <div className="vt-card vt-card-pad mt-4 text-center vt-muted">
          No tienes códigos de afiliado.
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {(data ?? []).map((a) => (
          <section key={a.affiliateId} className="vt-card vt-card-pad">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-lg font-black tracking-[-0.02em]">{a.displayName}</div>
                <div className="vt-muted text-sm">
                  Código <span className="font-mono">{a.code}</span> · Comisión{" "}
                  {commissionLabel(a.commissionKind, a.commissionValue, a.commissionCurrencyCode)}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] p-3">
                <div className="vt-muted flex items-center gap-1 text-xs">
                  <Eye size={14} /> Visitas
                </div>
                <div className="text-xl font-bold">{a.visits}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <div className="vt-muted flex items-center gap-1 text-xs">
                  <ShoppingCart size={14} /> Ventas
                </div>
                <div className="text-xl font-bold">{a.salesCount}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <div className="vt-muted text-xs">Comisiones acumuladas</div>
                <div className="flex flex-wrap gap-1">
                  {a.commissionTotals.length === 0 && <span className="text-sm">—</span>}
                  {a.commissionTotals.map((t) => (
                    <span key={t.currencyCode} className="text-sm font-semibold">
                      {formatMoney(t.amount, t.currencyCode)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
