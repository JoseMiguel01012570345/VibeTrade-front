import { useQuery } from "@tanstack/react-query";
import {
  fetchStatisticsCancellations,
  fetchStatisticsCustomers,
  fetchStatisticsDeliveredOrders,
  fetchStatisticsLandingExit,
  fetchStatisticsOrderFunnel,
  fetchStatisticsOrderLocations,
  fetchStatisticsOrdersByHour,
  fetchStatisticsOverview,
  fetchStatisticsProductViews,
  fetchStatisticsRevenueAverages,
  fetchStatisticsTraffic,
  fetchStatisticsTripKm,
  type StatisticsRange,
} from "../api/statisticsApi";

const STALE = 30_000;

function key(name: string, range: StatisticsRange, extra?: unknown) {
  return ["statistics", name, range.from, range.to, extra] as const;
}

export function useStatisticsOverview(range: StatisticsRange, deliveredOnly: boolean) {
  return useQuery({
    queryKey: key("overview", range, deliveredOnly),
    queryFn: () => fetchStatisticsOverview(range, deliveredOnly),
    staleTime: STALE,
  });
}

export function useStatisticsDeliveredOrders(range: StatisticsRange) {
  return useQuery({
    queryKey: key("delivered-orders", range),
    queryFn: () => fetchStatisticsDeliveredOrders(range),
    staleTime: STALE,
  });
}

export function useStatisticsRevenueAverages(range: StatisticsRange, deliveredOnly: boolean) {
  return useQuery({
    queryKey: key("revenue-averages", range, deliveredOnly),
    queryFn: () => fetchStatisticsRevenueAverages(range, deliveredOnly),
    staleTime: STALE,
  });
}

export function useStatisticsProductViews(range: StatisticsRange) {
  return useQuery({
    queryKey: key("product-views", range),
    queryFn: () => fetchStatisticsProductViews(range),
    staleTime: STALE,
  });
}

export function useStatisticsTripKm(range: StatisticsRange) {
  return useQuery({
    queryKey: key("trip-km", range),
    queryFn: () => fetchStatisticsTripKm(range),
    staleTime: STALE,
  });
}

export function useStatisticsOrderLocations(range: StatisticsRange) {
  return useQuery({
    queryKey: key("order-locations", range),
    queryFn: () => fetchStatisticsOrderLocations(range),
    staleTime: STALE,
  });
}

export function useStatisticsTraffic(range: StatisticsRange) {
  return useQuery({
    queryKey: key("traffic", range),
    queryFn: () => fetchStatisticsTraffic(range),
    staleTime: STALE,
  });
}

export function useStatisticsLandingExit(range: StatisticsRange) {
  return useQuery({
    queryKey: key("landing-exit", range),
    queryFn: () => fetchStatisticsLandingExit(range),
    staleTime: STALE,
  });
}

export function useStatisticsOrderFunnel(range: StatisticsRange) {
  return useQuery({
    queryKey: key("order-funnel", range),
    queryFn: () => fetchStatisticsOrderFunnel(range),
    staleTime: STALE,
  });
}

export function useStatisticsOrdersByHour(range: StatisticsRange) {
  return useQuery({
    queryKey: key("orders-by-hour", range),
    queryFn: () => fetchStatisticsOrdersByHour(range),
    staleTime: STALE,
  });
}

export function useStatisticsCustomers(range: StatisticsRange, deliveredOnly: boolean) {
  return useQuery({
    queryKey: key("customers", range, deliveredOnly),
    queryFn: () => fetchStatisticsCustomers(range, deliveredOnly),
    staleTime: STALE,
  });
}

export function useStatisticsCancellations(range: StatisticsRange) {
  return useQuery({
    queryKey: key("cancellations", range),
    queryFn: () => fetchStatisticsCancellations(range),
    staleTime: STALE,
  });
}
