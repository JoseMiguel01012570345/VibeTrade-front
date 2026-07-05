import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { StatisticsDateRangeFilter } from "../components/StatisticsDateRangeFilter";
import { StatisticsChartCard } from "../components/StatisticsChartCard";
import {
  StatisticsCustomersChart,
  StatisticsDeliveredOrdersChart,
  StatisticsLandingExitChart,
  StatisticsOrderFunnelChart,
  StatisticsPeakHoursChart,
  StatisticsProductViewsChart,
  StatisticsRevenueAveragesCharts,
  StatisticsTrafficChart,
  StatisticsTripKmChart,
} from "../components/StatisticsCharts";
import { StatisticsOrderLocationsMap } from "../components/StatisticsOrderLocationsMap";
import {
  defaultStatisticsRange,
  formatCurrencyAmounts,
  type StatisticsDateRange,
} from "../logic/statisticsRange";
import {
  useStatisticsCancellations,
  useStatisticsCustomers,
  useStatisticsDeliveredOrders,
  useStatisticsLandingExit,
  useStatisticsOrderFunnel,
  useStatisticsOrderLocations,
  useStatisticsOrdersByHour,
  useStatisticsOverview,
  useStatisticsProductViews,
  useStatisticsRevenueAverages,
  useStatisticsTraffic,
  useStatisticsTripKm,
} from "../hooks/useStatistics";

function KpiCard({
  label,
  value,
  accent,
  text,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  text?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-1 font-bold text-[var(--text)] ${text ? "text-base" : "text-2xl"} ${
          accent ? "text-emerald-600 dark:text-emerald-400" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function StatisticsPage() {
  const qc = useQueryClient();
  const [range, setRange] = useState<StatisticsDateRange>(defaultStatisticsRange);
  const [deliveredOnly, setDeliveredOnly] = useState(true);

  const rangeParams = useMemo(() => ({ from: range.from, to: range.to }), [range]);

  const overview = useStatisticsOverview(rangeParams, deliveredOnly);
  const delivered = useStatisticsDeliveredOrders(rangeParams);
  const revenueAverages = useStatisticsRevenueAverages(rangeParams, deliveredOnly);
  const productViews = useStatisticsProductViews(rangeParams);
  const tripKm = useStatisticsTripKm(rangeParams);
  const locations = useStatisticsOrderLocations(rangeParams);
  const traffic = useStatisticsTraffic(rangeParams);
  const landingExit = useStatisticsLandingExit(rangeParams);
  const funnel = useStatisticsOrderFunnel(rangeParams);
  const peakHours = useStatisticsOrdersByHour(rangeParams);
  const customers = useStatisticsCustomers(rangeParams, deliveredOnly);
  const cancellations = useStatisticsCancellations(rangeParams);

  const isLoading = overview.isLoading && delivered.isLoading;
  const isError = overview.isError;

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["statistics"] });
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-3 py-6">
      <header className="flex items-center gap-2">
        <BarChart3 className="text-[var(--primary)]" size={22} />
        <h1 className="text-xl font-black tracking-[-0.02em] text-[var(--text)]">
          Estadísticas
        </h1>
      </header>

      <StatisticsDateRangeFilter
        range={range}
        onChange={setRange}
        deliveredOnly={deliveredOnly}
        onDeliveredOnlyChange={setDeliveredOnly}
        onRefresh={refresh}
      />

      {isError ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {overview.error instanceof Error
            ? overview.error.message
            : "No se pudieron cargar las estadísticas."}
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <CeSpinner size="lg" className="text-[var(--primary)]" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Pedidos" value={overview.data?.totalOrders ?? 0} />
            <KpiCard label="Entregados" value={overview.data?.deliveredOrders ?? 0} accent />
            <KpiCard
              label="Ingresos"
              value={formatCurrencyAmounts(overview.data?.revenueByCurrency ?? [])}
              text
            />
            <KpiCard
              label="Visitantes / vistas producto"
              value={`${overview.data?.uniqueVisitors ?? 0} / ${overview.data?.productViews ?? 0}`}
              text
            />
          </div>

          <StatisticsDeliveredOrdersChart data={delivered.data} />
          <StatisticsRevenueAveragesCharts data={revenueAverages.data} />

          <div className="grid gap-4 xl:grid-cols-2">
            <StatisticsProductViewsChart data={productViews.data} />
            <StatisticsTripKmChart data={tripKm.data} />
          </div>

          <StatisticsOrderLocationsMap
            points={locations.data?.points ?? []}
            total={locations.data?.total ?? 0}
          />

          <StatisticsTrafficChart data={traffic.data} />
          <StatisticsLandingExitChart data={landingExit.data} />

          <div className="grid gap-4 xl:grid-cols-2">
            <StatisticsOrderFunnelChart data={funnel.data} />
            <StatisticsCustomersChart data={customers.data} />
          </div>

          <StatisticsPeakHoursChart data={peakHours.data} />

          <StatisticsChartCard title="Cancelaciones">
            <div className="grid gap-3 sm:grid-cols-3">
              <KpiCard
                label="Invalidados"
                value={`${cancellations.data?.invalidatedCount ?? 0} (${(cancellations.data?.invalidationRatePercent ?? 0).toFixed(1)}%)`}
                text
              />
              <KpiCard
                label="Eliminados"
                value={`${cancellations.data?.deletedCount ?? 0} (${(cancellations.data?.deletionRatePercent ?? 0).toFixed(1)}%)`}
                text
              />
              <KpiCard label="Total pedidos" value={cancellations.data?.totalOrders ?? 0} />
            </div>
          </StatisticsChartCard>
        </>
      )}
    </div>
  );
}
