export function fmtTrustHistoryWhen(ts: number): string {
  return new Date(ts).toLocaleString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
