import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { cn } from "@shared/lib/cn";

export type ProductModalPreviewModel = {
  name: string;
  description: string;
  weightOrLiters: string;
  price: number;
  currencyCode: string;
  photoSrc: string | null;
  stock: number;
  categoryLabel: string;
};

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 3.75a.75.75 0 0 1 .75-.75h1.02a1.5 1.5 0 0 1 1.46 1.15l.2.85h12.82a.75.75 0 0 1 .73.93l-1.56 6.5a1.5 1.5 0 0 1-1.46 1.15H8.13a1.5 1.5 0 0 1-1.46-1.16L4.82 4.5h-1.07A.75.75 0 0 1 3 3.75Zm5.5 15.75a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Zm9 0a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Z" />
    </svg>
  );
}

/** Vista previa de tarjeta de producto en el feed (mismo look que frontend-admin). */
export function ProductModalPreview({
  model,
  className,
}: {
  model: ProductModalPreviewModel;
  className?: string;
}) {
  const lowStock = model.stock <= 12;
  const disabled = model.stock <= 0;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[18px] border border-[#d9d5cf] bg-white p-3 shadow-[0_12px_30px_rgba(33,37,41,0.05)]",
        className,
      )}
    >
      <div className="block cursor-default">
        {model.photoSrc ? (
          <ProtectedMediaImg
            src={model.photoSrc}
            alt=""
            wrapperClassName="aspect-[4/3] w-full overflow-hidden rounded-[14px]"
            className="aspect-[4/3] w-full rounded-[14px] object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[14px] bg-stone-100 text-sm text-slate-400">
            Sin foto
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-1 pt-4">
        <p className="h-4 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {model.categoryLabel || "Categoría"}
        </p>
        <div className="mt-2 block shrink-0">
          <h3
            className="line-clamp-2 h-12 overflow-hidden text-lg font-extrabold leading-6 text-slate-900"
            title={model.name.trim() || undefined}
          >
            {model.name.trim() || "Nombre del producto"}
          </h3>
        </div>

        <p
          className="mt-2 line-clamp-2 h-10 shrink-0 overflow-hidden text-sm leading-5 text-slate-500"
          title={model.description.trim() || undefined}
        >
          {model.description.trim() || "\u00a0"}
        </p>

        <p
          className="mt-1 h-5 shrink-0 truncate text-sm font-semibold leading-5 text-slate-600"
          title={model.weightOrLiters || undefined}
        >
          {model.weightOrLiters.trim() || "\u00a0"}
        </p>

        <div className="mt-3 flex h-7 shrink-0 items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden />
            Disponible
          </span>
        </div>

        <div className="mt-4 h-8 shrink-0">
          <span className="block truncate text-[1.65rem] font-extrabold leading-none text-[#d9532b]">
            ${model.price.toFixed(2)} {model.currencyCode}
          </span>
        </div>

        <div className="mt-auto flex shrink-0 items-center justify-between gap-2 pt-5">
          <div className="flex items-center gap-3 rounded-full border border-[#d9d5cf] px-3 py-2 text-sm font-semibold text-slate-600">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#d9d5cf]">
              −
            </span>
            <span>1</span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#d9d5cf]">
              +
            </span>
          </div>

          <button
            type="button"
            disabled={disabled}
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition",
              disabled
                ? "cursor-not-allowed bg-slate-300"
                : "bg-emerald-700 hover:bg-emerald-800",
            )}
            aria-hidden
            tabIndex={-1}
          >
            <CartIcon className="h-5 w-5" />
          </button>
        </div>

        <p
          className={cn(
            "mt-3 text-center text-[11px] font-medium",
            lowStock ? "text-amber-700" : "text-slate-400",
          )}
        >
          Vista previa · Stock: {model.stock}{" "}
          {model.stock === 1 ? "unidad" : "unidades"}
        </p>
      </div>
    </div>
  );
}
