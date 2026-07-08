import type {
  StoreProduct,
  StoreService,
} from "@features/market/logic/storeCatalogTypes";
import { StorefrontProductCard } from "./StorefrontProductCard";
import { StorefrontServiceCard } from "./StorefrontServiceCard";

export function CategoryGrid({
  isService,
  products,
  services,
}: Readonly<{
  isService: boolean;
  products: StoreProduct[];
  services: StoreService[];
}>) {
  const isEmpty = isService ? services.length === 0 : products.length === 0;
  if (isEmpty) {
    return (
      <section>
        <p className="vt-storefront-section-panel rounded-[18px] border border-dashed px-5 py-10 text-center text-sm text-slate-500">
          {isService
            ? "No hay servicios disponibles en esta categoría."
            : "No hay productos disponibles en esta categoría."}
        </p>
      </section>
    );
  }
  return (
    <section>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        {isService
          ? services.map((s) => <StorefrontServiceCard key={s.id} s={s} />)
          : products.map((p) => <StorefrontProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
