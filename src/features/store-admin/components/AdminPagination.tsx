type AdminPaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (p: number) => void;
  itemLabel: string;
  className?: string;
};

export function AdminPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  itemLabel,
  className = "",
}: AdminPaginationProps) {
  if (totalItems === 0) return null;

  return (
    <nav
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
      aria-label="Paginación"
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {totalItems === 1 ? `1 ${itemLabel}` : `${totalItems} ${itemLabel}`} ·
        Página {page} de {totalPages}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
