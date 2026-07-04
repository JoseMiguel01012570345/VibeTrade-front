import { useEffect, useMemo, useState } from "react";

/** Paginación en cliente sobre un array ya cargado. */
export function usePagedSlice<T>(
  items: readonly T[],
  pageSize: number,
  resetDeps: readonly unknown[] = [],
) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, resetDeps);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const slice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, slice, total, totalPages, pageSize };
}
