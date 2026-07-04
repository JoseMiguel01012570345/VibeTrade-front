import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";
import type { SortMode } from "../logic/storefrontTypes";
import { CategorySortControl } from "./CategorySortControl";

export function CategoryHeader({
  storeHome,
  title,
  isService,
  sortOptions,
  sort,
  onSortChange,
  selectedSortLabel,
}: Readonly<{
  storeHome: string;
  title: string;
  isService: boolean;
  sortOptions: { value: SortMode; label: string }[];
  sort: SortMode;
  onSortChange: (value: SortMode) => void;
  selectedSortLabel: string;
}>) {
  return (
    <section className="rounded-[32px] border border-[#ece4dc] bg-[#fbfaf8] px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="mb-8 flex items-center gap-2 text-sm text-slate-400 sm:mb-10">
        <Link to={storeHome} className="transition hover:text-emerald-700">
          Inicio
        </Link>
        <span aria-hidden>›</span>
        <span className="min-w-0 truncate font-semibold text-slate-700">
          {title}
        </span>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-[3rem]">
            {isService ? (
              <Wrench
                className="h-7 w-7 shrink-0 text-emerald-700 lg:h-10 lg:w-10"
                aria-hidden
              />
            ) : null}
            {title}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
            {isService
              ? "Explora servicios en esta categoría."
              : "Explora productos en esta categoría."}
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center">
          <span className="text-sm font-bold text-slate-700">Ordenar por:</span>
          <CategorySortControl
            options={sortOptions}
            value={sort}
            onChange={onSortChange}
            selectedLabel={selectedSortLabel}
          />
        </div>
      </div>
    </section>
  );
}
