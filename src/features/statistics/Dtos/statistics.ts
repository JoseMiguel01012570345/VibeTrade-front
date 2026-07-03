export interface StatisticsDateSeriesPoint {
  date: string;
  count: number;
}

export interface StatisticsCurrencyAmount {
  currencyCode: string;
  amount: number;
}

export interface StatisticsOverviewDto {
  totalOrders: number;
  deliveredOrders: number;
  revenueByCurrency: StatisticsCurrencyAmount[];
  totalTripKm: number;
  tripCount: number;
  uniqueVisitors: number;
  pageViews: number;
  productViews: number;
}

export interface StatisticsDeliveredOrdersDto {
  total: number;
  series: StatisticsDateSeriesPoint[];
}

export interface StatisticsTripKmBucket {
  label: string;
  minKm: number;
  maxKm: number;
  count: number;
}

export interface StatisticsTripKmDto {
  totalKm: number;
  tripCount: number;
  minKm: number;
  medianKm: number;
  p90Km: number;
  histogram: StatisticsTripKmBucket[];
  tripsPerDay: StatisticsDateSeriesPoint[];
}

export interface StatisticsOrderLocationPoint {
  orderId: string;
  publicNumber: string;
  status: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface StatisticsOrderLocationsDto {
  total: number;
  points: StatisticsOrderLocationPoint[];
}

export interface StatisticsTrafficPathRow {
  path: string;
  views: number;
}

export interface StatisticsTrafficIpRow {
  ipAddress: string;
  displayLabel: string;
  sessions: number;
  pageViews: number;
}

export interface StatisticsTrafficDto {
  uniqueVisitors: number;
  pageViews: number;
  uniqueVisitorsPerDay: StatisticsDateSeriesPoint[];
  pageViewsPerDay: StatisticsDateSeriesPoint[];
  topPaths: StatisticsTrafficPathRow[];
  topIps: StatisticsTrafficIpRow[];
}

export interface StatisticsProductViewRow {
  productId: string;
  productName: string;
  views: number;
}

export interface StatisticsProductViewsDto {
  totalViews: number;
  viewsPerDay: StatisticsDateSeriesPoint[];
  topProducts: StatisticsProductViewRow[];
}

export interface StatisticsFunnelRow {
  status: string;
  count: number;
}

export interface StatisticsOrderFunnelDto {
  stages: StatisticsFunnelRow[];
}

export interface StatisticsPeakHourCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface StatisticsOrdersByHourDto {
  cells: StatisticsPeakHourCell[];
}

export interface StatisticsCustomersDto {
  newCustomers: number;
  returningCustomers: number;
  newCustomersPerDay: StatisticsDateSeriesPoint[];
  returningCustomersPerDay: StatisticsDateSeriesPoint[];
}

export interface StatisticsCancellationsDto {
  invalidatedCount: number;
  deletedCount: number;
  totalOrders: number;
  invalidationRatePercent: number;
  deletionRatePercent: number;
}

export interface StatisticsLandingExitRow {
  path: string;
  count: number;
  isLanding: boolean;
}

export interface StatisticsLandingExitDto {
  landingPages: StatisticsLandingExitRow[];
  exitPages: StatisticsLandingExitRow[];
}

export interface StatisticsRevenueAverageBucket {
  bucket: string;
  amount: number;
}

export interface StatisticsRevenueAverageSeries {
  granularity: string;
  currencyCode: string;
  series: StatisticsRevenueAverageBucket[];
  averageAmount: number;
}

export interface StatisticsRevenueAveragesDto {
  daily: StatisticsRevenueAverageSeries;
  monthly: StatisticsRevenueAverageSeries;
  hourly: StatisticsRevenueAverageSeries;
}

export interface StatisticsRangeParams {
  from: string;
  to: string;
  deliveredOnly?: boolean;
}
