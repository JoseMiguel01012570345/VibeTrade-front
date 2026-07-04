export function ymdToNoonDate(ymd: string): Date | undefined {
  const s = ymd.trim();
  if (!s) return undefined;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function orderStatusPillClass(status: number): string {
  switch (status) {
    case 0:
      return "bg-emerald-100/95 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100";
    case 1:
      return "bg-slate-100 text-slate-800 dark:bg-slate-800/90 dark:text-slate-100";
    case 2:
      return "bg-green-200/80 text-green-900 dark:bg-green-900/45 dark:text-green-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
  }
}

/** Iniciales para avatar placeholder del nombre del cliente. */
export function tcpInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? parts[0];
  return (parts[0][0] + last[0]).toUpperCase();
}

/** Paginación tipo guía: 1 … 5 6 7 … 10 */
export function visiblePageItems(
  page: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "ellipsis")[] = [];
  const range: number[] = [];
  const delta = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      range.push(i);
    }
  }
  let prev = 0;
  for (const i of range) {
    if (prev && i - prev > 1) {
      items.push("ellipsis");
    }
    items.push(i);
    prev = i;
  }
  return items;
}
