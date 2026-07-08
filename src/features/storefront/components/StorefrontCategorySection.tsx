import { Wrench } from "lucide-react";
import {
  storeCategoryHref,
  storeServiceCategoryHref,
} from "@features/market/logic/store/storePath";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import type { CategoryMeta } from "../logic/storefrontTypes";
import { CategoryTileCarousel } from "./CategoryTileCarousel";

export function StorefrontCategorySection({
  store,
  productCategoryMetas,
  serviceCategoryMetas,
}: Readonly<{
  store: StoreBadge;
  productCategoryMetas: CategoryMeta[];
  serviceCategoryMetas: CategoryMeta[];
}>) {
  if (productCategoryMetas.length === 0 && serviceCategoryMetas.length === 0) {
    return null;
  }

  return (
    <section id="storefront-categorias" className="scroll-mt-24 space-y-6">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Explora por Categoría
        </h2>
        <p className="text-sm text-slate-500">
          Entra a una familia de productos y navega su catálogo dedicado.
        </p>
      </div>

      {productCategoryMetas.length > 0 ? (
        <CategoryTileCarousel
          categories={productCategoryMetas}
          hrefFor={(category) => storeCategoryHref(store, category.slug)}
          ariaLabel="Categorías de productos"
          kind="product"
        />
      ) : null}

      {serviceCategoryMetas.length > 0 ? (
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Servicios
          </p>
          <CategoryTileCarousel
            categories={serviceCategoryMetas}
            hrefFor={(category) =>
              storeServiceCategoryHref(store, category.label)
            }
            ariaLabel="Categorías de servicios"
            kind="service"
          />
        </div>
      ) : null}
    </section>
  );
}
