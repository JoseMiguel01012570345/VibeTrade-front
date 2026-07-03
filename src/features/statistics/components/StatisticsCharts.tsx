import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatisticsChartCard, StatisticsEmpty } from "./StatisticsChartCard";
import { CHART_COLORS, DAY_LABELS, ORDER_STATUS_LABELS } from "../logic/statisticsRange";
import { axisTick, statsChartMargin, statsXLabel, statsYLabel } from "../logic/chartAxes";
import type {
  StatisticsCustomersDto,
  StatisticsDeliveredOrdersDto,
  StatisticsLandingExitDto,
  StatisticsOrderFunnelDto,
  StatisticsOrdersByHourDto,
  StatisticsProductViewsDto,
  StatisticsRevenueAverageSeries,
  StatisticsRevenueAveragesDto,
  StatisticsTrafficDto,
  StatisticsTripKmDto,
} from "../Dtos/statistics";

function formatAmount(amount: number, currencyCode: string): string {
  if (!currencyCode) return amount.toLocaleString("es");
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("es")} ${currencyCode}`;
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function StatisticsDeliveredOrdersChart({
  data,
}: {
  data?: StatisticsDeliveredOrdersDto;
}) {
  const series = data?.series ?? [];
  const hasData = series.some((p) => p.count > 0);
  return (
    <StatisticsChartCard
      title="Pedidos entregados"
      subtitle={data ? `Total en intervalo: ${data.total}` : undefined}
    >
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={series} margin={{ ...statsChartMargin.withBothLabels, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={axisTick} label={statsXLabel("Fecha")} minTickGap={24} />
            <YAxis allowDecimals={false} tick={axisTick} label={statsYLabel("Entregados")} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              name="Entregados"
              stroke={CHART_COLORS[0]}
              strokeWidth={2}
              dot={false}
            />
            <Brush dataKey="date" height={24} stroke={CHART_COLORS[0]} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <StatisticsEmpty message="Sin entregas en este intervalo." />
      )}
    </StatisticsChartCard>
  );
}

function RevenueAverageChart({
  title,
  subtitle,
  series,
  xLabel,
  brush,
}: {
  title: string;
  subtitle?: string;
  series: StatisticsRevenueAverageSeries;
  xLabel: string;
  brush?: boolean;
}) {
  const rows = (series.series ?? []).map((p) => ({
    bucket: p.bucket,
    amount: p.amount,
    average: series.averageAmount,
  }));
  const hasData = rows.some((p) => p.amount > 0);

  return (
    <StatisticsChartCard title={title} subtitle={subtitle}>
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={rows}
            margin={{
              ...statsChartMargin.withBothLabels,
              bottom: brush ? 48 : statsChartMargin.withBothLabels.bottom,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="bucket" tick={axisTick} label={statsXLabel(xLabel)} minTickGap={16} />
            <YAxis tick={axisTick} label={statsYLabel(series.currencyCode || "Ingresos")} width={56} />
            <Tooltip
              formatter={(value, name) => [
                formatAmount(Number(value ?? 0), series.currencyCode),
                name === "amount" ? "Ingresos" : "Media",
              ]}
            />
            <Bar dataKey="amount" name="amount" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="average"
              name="average"
              stroke={CHART_COLORS[2]}
              strokeWidth={2}
              dot={false}
            />
            <ReferenceLine
              y={series.averageAmount}
              stroke={CHART_COLORS[2]}
              strokeDasharray="4 4"
            />
            {brush ? <Brush dataKey="bucket" height={24} stroke={CHART_COLORS[1]} /> : null}
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <StatisticsEmpty message="Sin ingresos en este intervalo." />
      )}
    </StatisticsChartCard>
  );
}

export function StatisticsRevenueAveragesCharts({
  data,
}: {
  data?: StatisticsRevenueAveragesDto;
}) {
  if (!data) return null;
  const currency = data.daily.currencyCode;
  return (
    <div className="space-y-4">
      <RevenueAverageChart
        title="Ingresos por día"
        subtitle={`Media diaria: ${formatAmount(data.daily.averageAmount, currency)}`}
        series={data.daily}
        xLabel="Fecha"
        brush
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueAverageChart
          title="Ingresos por mes"
          subtitle={`Media mensual: ${formatAmount(data.monthly.averageAmount, currency)}`}
          series={data.monthly}
          xLabel="Mes"
        />
        <RevenueAverageChart
          title="Ingreso medio por hora del día"
          subtitle={`Media entre franjas: ${formatAmount(data.hourly.averageAmount, currency)}`}
          series={data.hourly}
          xLabel="Hora (UTC)"
        />
      </div>
      <p className="text-xs text-[var(--muted)]">
        Moneda principal del intervalo: {currency || "—"}. La línea indica la media del
        periodo; en horas, cada barra es el ingreso medio en esa franja horaria.
      </p>
    </div>
  );
}

export function StatisticsProductViewsChart({
  data,
}: {
  data?: StatisticsProductViewsDto;
}) {
  if (!data || data.totalViews === 0) {
    return (
      <StatisticsChartCard title="Vistas de productos">
        <StatisticsEmpty message="Sin vistas registradas en este intervalo." />
      </StatisticsChartCard>
    );
  }

  const top = data.topProducts.slice(0, 12).map((p) => ({
    name: truncate(p.productName, 24),
    views: p.views,
  }));

  return (
    <StatisticsChartCard title="Vistas de productos" subtitle={`${data.totalViews} vistas totales`}>
      <div className="grid gap-4 lg:grid-cols-2">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.viewsPerDay} margin={statsChartMargin.withBothLabels}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={axisTick} label={statsXLabel("Fecha")} minTickGap={24} />
            <YAxis allowDecimals={false} tick={axisTick} label={statsYLabel("Vistas")} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              name="Vistas/día"
              stroke={CHART_COLORS[3]}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={top} layout="vertical" margin={statsChartMargin.withBothLabels}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis type="number" allowDecimals={false} tick={axisTick} label={statsXLabel("Vistas")} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              label={statsYLabel("Producto")}
            />
            <Tooltip />
            <Bar dataKey="views" name="Vistas" fill={CHART_COLORS[4]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </StatisticsChartCard>
  );
}

export function StatisticsTripKmChart({ data }: { data?: StatisticsTripKmDto }) {
  if (!data || data.tripCount === 0) {
    return (
      <StatisticsChartCard title="Kilómetros por viaje">
        <StatisticsEmpty message="Sin viajes con distancia calculada en este intervalo." />
      </StatisticsChartCard>
    );
  }

  return (
    <StatisticsChartCard
      title="Kilómetros por viaje"
      subtitle={`${data.tripCount} viajes · ${data.totalKm.toFixed(1)} km totales · mediana ${data.medianKm.toFixed(1)} km · p90 ${data.p90Km.toFixed(1)} km`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.histogram} margin={statsChartMargin.tallXTicks}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
              label={statsXLabel("Rango (km)", -10)}
            />
            <YAxis allowDecimals={false} tick={axisTick} label={statsYLabel("Viajes")} />
            <Tooltip />
            <Bar dataKey="count" name="Viajes" fill={CHART_COLORS[2]} />
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data.tripsPerDay} margin={statsChartMargin.withBothLabels}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={axisTick} label={statsXLabel("Fecha")} minTickGap={24} />
            <YAxis allowDecimals={false} tick={axisTick} label={statsYLabel("Viajes")} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              name="Viajes/día"
              stroke={CHART_COLORS[3]}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </StatisticsChartCard>
  );
}

function TrafficIpTable({
  rows,
}: {
  rows: { ipAddress: string; displayLabel: string; sessions: number; pageViews: number }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[var(--border)] text-[var(--muted)]">
            <th className="py-2 pr-4 font-medium">Ubicación</th>
            <th className="py-2 pr-4 font-medium">Sesiones</th>
            <th className="py-2 font-medium">Pageviews</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ipAddress} className="border-b border-[var(--border)]/60">
              <td className="py-1.5 pr-4" title={row.ipAddress}>
                {row.displayLabel}
              </td>
              <td className="py-1.5 pr-4">{row.sessions}</td>
              <td className="py-1.5">{row.pageViews}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatisticsTrafficChart({ data }: { data?: StatisticsTrafficDto }) {
  if (!data || (data.pageViews === 0 && data.uniqueVisitors === 0)) {
    return (
      <StatisticsChartCard title="Tráfico del sitio">
        <StatisticsEmpty message="Sin datos de visitas (tráfico global, solo superadmin)." />
      </StatisticsChartCard>
    );
  }

  return (
    <StatisticsChartCard
      title="Tráfico del sitio"
      subtitle={`${data.uniqueVisitors} visitantes únicos · ${data.pageViews} pageviews`}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.uniqueVisitorsPerDay} margin={statsChartMargin.withBothLabels}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={axisTick} label={statsXLabel("Fecha")} minTickGap={24} />
            <YAxis allowDecimals={false} tick={axisTick} label={statsYLabel("Visitantes")} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="count"
              name="Visitantes"
              stroke={CHART_COLORS[0]}
              fill={CHART_COLORS[0]}
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.topPaths.slice(0, 10)} margin={statsChartMargin.tallXTicks}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="path"
              tick={{ fontSize: 9, fill: "var(--muted)" }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={70}
              label={statsXLabel("Ruta", -12)}
            />
            <YAxis allowDecimals={false} tick={axisTick} label={statsYLabel("Vistas")} />
            <Tooltip />
            <Bar dataKey="views" name="Vistas" fill={CHART_COLORS[1]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TrafficIpTable rows={data.topIps} />
    </StatisticsChartCard>
  );
}

function LandingExitBars({
  title,
  rows,
  fill,
}: {
  title: string;
  rows: { path: string; count: number }[];
  fill: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[var(--muted)]">{title}</p>
      {rows.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.min(320, 48 + rows.length * 28)}>
          <BarChart data={rows} layout="vertical" margin={{ ...statsChartMargin.withBothLabels, left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis type="number" allowDecimals={false} tick={axisTick} label={statsXLabel("Sesiones")} />
            <YAxis
              type="category"
              dataKey="path"
              width={130}
              tick={{ fontSize: 9, fill: "var(--muted)" }}
              label={statsYLabel("Página")}
            />
            <Tooltip />
            <Bar dataKey="count" name="Sesiones" fill={fill} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <StatisticsEmpty message="Sin datos." />
      )}
    </div>
  );
}

export function StatisticsLandingExitChart({
  data,
}: {
  data?: StatisticsLandingExitDto;
}) {
  const landing = data?.landingPages.map((r) => ({ path: r.path, count: r.count })) ?? [];
  const exit = data?.exitPages.map((r) => ({ path: r.path, count: r.count })) ?? [];
  const hasData = landing.some((r) => r.count > 0) || exit.some((r) => r.count > 0);

  if (!hasData) {
    return (
      <StatisticsChartCard title="Páginas de entrada y salida">
        <StatisticsEmpty message="Sin pageviews con sesión en el intervalo." />
      </StatisticsChartCard>
    );
  }

  return (
    <StatisticsChartCard
      title="Páginas de entrada y salida"
      subtitle="Primera y última ruta por sesión"
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <LandingExitBars title="Entrada (landing)" rows={landing} fill={CHART_COLORS[0]} />
        <LandingExitBars title="Salida (exit)" rows={exit} fill={CHART_COLORS[1]} />
      </div>
    </StatisticsChartCard>
  );
}

export function StatisticsOrderFunnelChart({
  data,
}: {
  data?: StatisticsOrderFunnelDto;
}) {
  const rows = (data?.stages ?? []).map((s) => ({
    status: ORDER_STATUS_LABELS[s.status] ?? s.status,
    count: s.count,
  }));
  const hasData = rows.some((r) => r.count > 0);
  return (
    <StatisticsChartCard title="Embudo de pedidos">
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows} margin={statsChartMargin.withBothLabels}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="status" tick={axisTick} label={statsXLabel("Estado")} />
            <YAxis allowDecimals={false} tick={axisTick} label={statsYLabel("Pedidos")} />
            <Tooltip />
            <Bar dataKey="count" name="Pedidos">
              {rows.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <StatisticsEmpty message="Sin pedidos en el intervalo." />
      )}
    </StatisticsChartCard>
  );
}

export function StatisticsCustomersChart({
  data,
}: {
  data?: StatisticsCustomersDto;
}) {
  if (!data) return null;
  const pie = [
    { name: "Nuevos", value: data.newCustomers },
    { name: "Recurrentes", value: data.returningCustomers },
  ];
  const hasData = pie.some((p) => p.value > 0);

  return (
    <StatisticsChartCard
      title="Clientes"
      subtitle={`${data.newCustomers} nuevos · ${data.returningCustomers} recurrentes`}
    >
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={pie} dataKey="value" nameKey="name" label>
              {pie.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <StatisticsEmpty message="Sin clientes identificados." />
      )}
    </StatisticsChartCard>
  );
}

export function StatisticsPeakHoursChart({
  data,
}: {
  data?: StatisticsOrdersByHourDto;
}) {
  const cells = data?.cells ?? [];
  const max = cells.reduce((m, c) => Math.max(m, c.count), 0);
  const lookup = new Map<string, number>();
  for (const c of cells) lookup.set(`${c.dayOfWeek}-${c.hour}`, c.count);

  return (
    <StatisticsChartCard title="Horas pico" subtitle="Pedidos por día y hora (UTC)">
      {max > 0 ? (
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="flex text-[10px] text-[var(--muted)]">
              <div className="w-8 shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center">
                  {h % 3 === 0 ? h : ""}
                </div>
              ))}
            </div>
            {DAY_LABELS.map((label, day) => (
              <div key={label} className="flex items-center">
                <div className="w-8 shrink-0 text-[10px] text-[var(--muted)]">{label}</div>
                {Array.from({ length: 24 }, (_, hour) => {
                  const count = lookup.get(`${day}-${hour}`) ?? 0;
                  const intensity = max > 0 ? count / max : 0;
                  return (
                    <div
                      key={hour}
                      className="m-[1px] h-5 flex-1 rounded-sm"
                      title={`${label} ${hour}:00 — ${count} pedido(s)`}
                      style={{
                        backgroundColor:
                          count > 0
                            ? `color-mix(in oklab, ${CHART_COLORS[0]} ${15 + intensity * 85}%, transparent)`
                            : "var(--border)",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <StatisticsEmpty message="Sin pedidos en el intervalo." />
      )}
    </StatisticsChartCard>
  );
}
