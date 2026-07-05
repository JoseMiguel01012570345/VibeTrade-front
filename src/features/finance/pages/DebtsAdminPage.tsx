import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { toast } from "sonner";
import { formatMoney } from "@features/orders";
import { useDebtsOverview, useLiquidateDebts } from "../hooks/useFinance";
import type {
  AffiliateDebtDto,
  DebtCurrencyTotalDto,
  WarehouseDebtDto,
} from "../Dtos/finance";

function TotalsRow({ label, totals }: { label: string; totals: DebtCurrencyTotalDto[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="vt-muted text-sm">{label}:</span>
      {totals.length === 0 && <span className="text-sm">—</span>}
      {totals.map((t) => (
        <span
          key={t.currencyCode}
          className="rounded-full border border-[var(--border)] px-3 py-1 text-sm font-semibold"
        >
          {formatMoney(t.amount, t.currencyCode)}
        </span>
      ))}
    </div>
  );
}

export function DebtsAdminPage() {
  const [includeLiquidated, setIncludeLiquidated] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Set<string>>(new Set());
  const [selectedAffiliate, setSelectedAffiliate] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useDebtsOverview(includeLiquidated, includeDeleted);
  const liquidate = useLiquidateDebts();

  const selectedCount = selectedWarehouse.size + selectedAffiliate.size;

  const pendingWarehouse = useMemo(
    () => (data?.warehouse ?? []).filter((d) => !d.liquidated && !d.deleted),
    [data],
  );
  const pendingAffiliate = useMemo(
    () => (data?.affiliate ?? []).filter((d) => !d.liquidated && !d.deleted),
    [data],
  );

  function toggle(set: Set<string>, id: string, apply: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  }

  async function onLiquidate() {
    if (selectedCount === 0) return;
    try {
      const res = await liquidate.mutateAsync({
        warehouseDebtIds: [...selectedWarehouse],
        affiliateDebtIds: [...selectedAffiliate],
      });
      toast.success(
        `Liquidadas ${res.liquidatedWarehouse + res.liquidatedAffiliate} deuda(s).`,
      );
      setSelectedWarehouse(new Set());
      setSelectedAffiliate(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo liquidar.");
    }
  }

  return (
    <div className="container vt-page">
      <div className="flex items-center gap-2">
        <Wallet />
        <h1 className="vt-h1">Finanzas · Deudas</h1>
      </div>

      <div className="vt-card vt-card-pad mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeLiquidated}
              onChange={(e) => setIncludeLiquidated(e.target.checked)}
            />
            Incluir liquidadas
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
            />
            Incluir eliminadas
          </label>
        </div>
        <TotalsRow label="Pendiente" totals={data?.pendingTotals ?? []} />
        <TotalsRow label="Liquidado" totals={data?.liquidatedTotals ?? []} />
        <div>
          <button
            className="vt-btn vt-btn-primary"
            disabled={selectedCount === 0 || liquidate.isPending}
            onClick={onLiquidate}
          >
            {liquidate.isPending ? "Liquidando…" : `Liquidar seleccionadas (${selectedCount})`}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <CeSpinner />
        </div>
      )}
      {isError && (
        <div className="vt-card vt-card-pad mt-4 text-center">No se pudieron cargar las deudas.</div>
      )}

      {!isLoading && !isError && (
        <div className="mt-4 flex flex-col gap-6">
          <DebtSection<WarehouseDebtDto>
            title="Deudas de almacén (tienda)"
            rows={data?.warehouse ?? []}
            selectable={pendingWarehouse}
            selected={selectedWarehouse}
            onToggle={(id) => toggle(selectedWarehouse, id, setSelectedWarehouse)}
            columns={(d) => [d.orderPublicNumber, d.storeId]}
            columnHeaders={["Pedido", "Almacén"]}
          />
          <DebtSection<AffiliateDebtDto>
            title="Deudas de afiliado"
            rows={data?.affiliate ?? []}
            selectable={pendingAffiliate}
            selected={selectedAffiliate}
            onToggle={(id) => toggle(selectedAffiliate, id, setSelectedAffiliate)}
            columns={(d) => [d.orderPublicNumber, d.affiliateCode]}
            columnHeaders={["Pedido", "Código afiliado"]}
          />
          <CarrierDebtSection rows={data?.carrier ?? []} />
        </div>
      )}
    </div>
  );
}

interface DebtLike {
  id: string;
  amount: number;
  currencyCode: string;
  liquidated: boolean;
  deleted: boolean;
  createdAtUtc: string;
}

function DebtSection<T extends DebtLike>({
  title,
  rows,
  selectable,
  selected,
  onToggle,
  columns,
  columnHeaders,
}: {
  title: string;
  rows: T[];
  selectable: T[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  columns: (row: T) => string[];
  columnHeaders: string[];
}) {
  const selectableIds = new Set(selectable.map((r) => r.id));
  return (
    <section className="vt-card vt-card-pad">
      <h2 className="vt-h2 mb-3">{title}</h2>
      {rows.length === 0 ? (
        <div className="vt-muted text-sm">Sin deudas.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="vt-muted">
                <th className="p-2"></th>
                {columnHeaders.map((h) => (
                  <th key={h} className="p-2">
                    {h}
                  </th>
                ))}
                <th className="p-2">Importe</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      disabled={!selectableIds.has(r.id)}
                      checked={selected.has(r.id)}
                      onChange={() => onToggle(r.id)}
                    />
                  </td>
                  {columns(r).map((c, i) => (
                    <td key={i} className="p-2 font-medium">
                      {c}
                    </td>
                  ))}
                  <td className="p-2 font-semibold">{formatMoney(r.amount, r.currencyCode)}</td>
                  <td className="p-2">
                    {r.deleted ? "Eliminada" : r.liquidated ? "Liquidada" : "Pendiente"}
                  </td>
                  <td className="p-2 vt-muted">{new Date(r.createdAtUtc).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CarrierDebtSection({
  rows,
}: {
  rows: import("../Dtos/finance").CarrierDebtDto[];
}) {
  return (
    <section className="vt-card vt-card-pad">
      <h2 className="vt-h2 mb-3">Deudas de transportista (auto-liquidadas)</h2>
      {rows.length === 0 ? (
        <div className="vt-muted text-sm">Sin deudas.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="vt-muted">
                <th className="p-2">Pedido</th>
                <th className="p-2">Transportista</th>
                <th className="p-2">Km</th>
                <th className="p-2">Tarifa/km</th>
                <th className="p-2">Importe</th>
                <th className="p-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="p-2 font-medium">{r.orderPublicNumber}</td>
                  <td className="p-2">{r.carrierUserId}</td>
                  <td className="p-2">{r.totalKm.toFixed(2)}</td>
                  <td className="p-2">{formatMoney(r.ratePerKm, r.currencyCode)}</td>
                  <td className="p-2 font-semibold">{formatMoney(r.amount, r.currencyCode)}</td>
                  <td className="p-2 vt-muted">{new Date(r.createdAtUtc).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
