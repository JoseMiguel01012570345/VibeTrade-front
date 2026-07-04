import type { SupplierPortalDashboardKpis } from "../Dtos/supplierPortalTypes";
import { formatMoney } from "@features/orders";
import { ProveedorSectionSummaryCard } from "../components/ProveedorSectionSummaryCard";

export function ProveedorSectionSummaryCards({
  kpis,
}: {
  kpis: SupplierPortalDashboardKpis;
}) {
  const code = kpis.currencyCode || "USD";
  return (
    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
      <ProveedorSectionSummaryCard
        title="Fondos BanderaExpress"
        value={formatMoney(kpis.fondosBanderaExpress, code)}
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        }
      />
      <ProveedorSectionSummaryCard
        title="Listo para retiro"
        value={formatMoney(kpis.listoParaRetiro, code)}
        accent="green"
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        }
      />
      <ProveedorSectionSummaryCard
        title="Fondos restantes"
        value={formatMoney(kpis.volumenVenta, code)}
        accent="gray"
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 5 5-9" />
          </svg>
        }
      />
    </div>
  );
}
