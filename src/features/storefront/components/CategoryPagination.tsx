import { PaginationArrow } from "./PaginationArrow";

export function CategoryPagination({
  page,
  totalPages,
  onChange,
}: Readonly<{
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}>) {
  if (totalPages <= 1) return null;
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <section className="flex justify-center">
      <nav className="flex items-center gap-2" aria-label="Paginación de categoría">
        <PaginationArrow
          direction="prev"
          disabled={page <= 1}
          onClick={() => onChange(Math.max(1, page - 1))}
        />
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onChange(pageNumber)}
            className={`inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-full px-3 text-sm font-bold transition ${
              pageNumber === page
                ? "bg-emerald-700 text-white shadow-sm"
                : "border border-[#d9d5cf] bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            }`}
            aria-current={pageNumber === page ? "page" : undefined}
          >
            {pageNumber}
          </button>
        ))}
        <PaginationArrow
          direction="next"
          disabled={page >= totalPages}
          onClick={() => onChange(Math.min(totalPages, page + 1))}
        />
      </nav>
    </section>
  );
}
