import { apiFetch } from "@shared/services/http/apiClient";
import { apiErrorTextToUserMessage } from "@shared/services/http/apiErrorMessage";
import type {
  StatisticsCancellationsDto,
  StatisticsCustomersDto,
  StatisticsDeliveredOrdersDto,
  StatisticsLandingExitDto,
  StatisticsOrderFunnelDto,
  StatisticsOrderLocationsDto,
  StatisticsOrdersByHourDto,
  StatisticsOverviewDto,
  StatisticsProductViewsDto,
  StatisticsRevenueAveragesDto,
  StatisticsTrafficDto,
  StatisticsTripKmDto,
} from "../Dtos/statistics";

export interface StatisticsRange {
  from: string;
  to: string;
}

async function throwFromResponse(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  throw new Error(apiErrorTextToUserMessage(text));
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    qs.set(key, String(value));
  }
  return qs.toString();
}

async function getJson<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as T;
}

export function fetchStatisticsOverview(
  range: StatisticsRange,
  deliveredOnly = true,
): Promise<StatisticsOverviewDto> {
  return getJson(`/api/v1/statistics/overview?${buildQuery({ ...range, deliveredOnly })}`);
}

export function fetchStatisticsDeliveredOrders(
  range: StatisticsRange,
): Promise<StatisticsDeliveredOrdersDto> {
  return getJson(`/api/v1/statistics/delivered-orders?${buildQuery({ ...range })}`);
}

export function fetchStatisticsTripKm(range: StatisticsRange): Promise<StatisticsTripKmDto> {
  return getJson(`/api/v1/statistics/trip-km?${buildQuery({ ...range })}`);
}

export function fetchStatisticsOrderLocations(
  range: StatisticsRange,
  pageSize = 2000,
): Promise<StatisticsOrderLocationsDto> {
  return getJson(
    `/api/v1/statistics/order-locations?${buildQuery({ ...range, deliveredOnly: false, pageSize })}`,
  );
}

export function fetchStatisticsTraffic(range: StatisticsRange): Promise<StatisticsTrafficDto> {
  return getJson(`/api/v1/statistics/traffic?${buildQuery({ ...range })}`);
}

export function fetchStatisticsLandingExit(
  range: StatisticsRange,
  limit = 12,
): Promise<StatisticsLandingExitDto> {
  return getJson(`/api/v1/statistics/traffic/landing-exit?${buildQuery({ ...range, limit })}`);
}

export function fetchStatisticsProductViews(
  range: StatisticsRange,
  limit = 15,
): Promise<StatisticsProductViewsDto> {
  return getJson(`/api/v1/statistics/product-views?${buildQuery({ ...range, limit })}`);
}

export function fetchStatisticsOrderFunnel(
  range: StatisticsRange,
): Promise<StatisticsOrderFunnelDto> {
  return getJson(`/api/v1/statistics/order-funnel?${buildQuery({ ...range })}`);
}

export function fetchStatisticsOrdersByHour(
  range: StatisticsRange,
): Promise<StatisticsOrdersByHourDto> {
  return getJson(`/api/v1/statistics/orders-by-hour?${buildQuery({ ...range })}`);
}

export function fetchStatisticsCustomers(
  range: StatisticsRange,
  deliveredOnly = true,
): Promise<StatisticsCustomersDto> {
  return getJson(`/api/v1/statistics/customers?${buildQuery({ ...range, deliveredOnly })}`);
}

export function fetchStatisticsCancellations(
  range: StatisticsRange,
): Promise<StatisticsCancellationsDto> {
  return getJson(`/api/v1/statistics/cancellations?${buildQuery({ ...range })}`);
}

export function fetchStatisticsRevenueAverages(
  range: StatisticsRange,
  deliveredOnly = true,
): Promise<StatisticsRevenueAveragesDto> {
  return getJson(`/api/v1/statistics/revenue/averages?${buildQuery({ ...range, deliveredOnly })}`);
}
