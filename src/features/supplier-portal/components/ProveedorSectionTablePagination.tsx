import { cn } from "@shared/lib/cn";
import { visiblePageItems } from "../logic/proveedorTableHelpers";

export function ProveedorSectionTablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pageItems = visiblePageItems(page, totalPages);

  return (
    <nav
      className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Paginación"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={cn(
          "text-sm font-medium transition",
          page <= 1
            ? "cursor-not-allowed text-gray-400 dark:text-gray-600"
            : "text-gray-800 hover:text-[#0f6b4f] dark:text-gray-200 dark:hover:text-emerald-300",
        )}
      >
        &lt; Anterior
      </button>

      <div className="flex flex-col items-center gap-1">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {pageItems.map((item, idx) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={cn(
                  "flex min-h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-semibold tabular-nums transition",
                  item === page
                    ? "bg-[#0f6b4f] text-white shadow-sm dark:bg-[#0f6b4f]"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                )}
                aria-current={item === page ? "page" : undefined}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="text-gray-500 dark:text-gray-500">Mostrando </span>
          <span className="tabular-nums font-semibold text-gray-900 dark:text-white">
            {start}–{end}
          </span>
          <span className="text-gray-500 dark:text-gray-500"> de </span>
          <span className="tabular-nums font-semibold text-gray-900 dark:text-white">
            {total}
          </span>
          <span className="text-gray-600 dark:text-gray-400"> registros</span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={cn(
          "text-sm font-medium transition",
          page >= totalPages
            ? "cursor-not-allowed text-gray-400 dark:text-gray-600"
            : "text-gray-800 hover:text-[#0f6b4f] dark:text-gray-200 dark:hover:text-emerald-300",
        )}
      >
        Siguiente &gt;
      </button>
    </nav>
  );
}
