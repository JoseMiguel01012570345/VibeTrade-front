import type { StoreProduct } from "@features/market/logic/storeCatalogTypes";
import { StorefrontProductCard } from "./StorefrontProductCard";

export function StorefrontLatestProductsSection({
  products,
  onProductSelect,
}: Readonly<{
  products: StoreProduct[];
  onProductSelect?: (product: StoreProduct) => void;
}>) {
  if (products.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="vt-storefront-section-title text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Productos más recientes
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
          {products.map((p) => (
            <StorefrontProductCard key={p.id} p={p} onSelect={onProductSelect} />
          ))}
        </div>
    </section>
  );
}
