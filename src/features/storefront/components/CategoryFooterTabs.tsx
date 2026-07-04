import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";

export function CategoryFooterTabs({
  categories,
  current,
  isService,
  hrefFor,
}: Readonly<{
  categories: string[];
  current: string;
  isService: boolean;
  hrefFor: (name: string) => string;
}>) {
  if (categories.length === 0) return null;
  return (
    <section className="relative -mx-4 sm:mx-0">
      <div
        className="store-no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 pt-1 [-webkit-overflow-scrolling:touch] sm:gap-3 sm:px-0"
        role="list"
        aria-label={isService ? "Más categorías de servicios" : "Más categorías"}
      >
        {categories.map((name) => {
          const active = name === current;
          return (
            <Link
              key={name}
              to={hrefFor(name)}
              role="listitem"
              className={`flex min-h-[2.75rem] min-w-[8.25rem] max-w-[11rem] shrink-0 items-center justify-center gap-1.5 rounded-[16px] border px-3 py-2 text-center text-xs font-bold leading-snug transition sm:min-w-[9.5rem] sm:max-w-none sm:px-4 sm:py-4 sm:text-sm ${
                active
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-[#d9d5cf] bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              {isService ? (
                <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : null}
              {name}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
