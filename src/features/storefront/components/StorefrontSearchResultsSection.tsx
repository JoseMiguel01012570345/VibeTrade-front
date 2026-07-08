import type {
  StoreProduct,
  StoreService,
} from "@features/market/logic/storeCatalogTypes";
import { StorefrontProductCard } from "./StorefrontProductCard";
import { StorefrontServiceCard } from "./StorefrontServiceCard";

export function StorefrontSearchResultsSection({
  products,
  services,
  loading,
  onProductSelect,
  onServiceSelect,
}: Readonly<{
  products: StoreProduct[];
  services: StoreService[];
  loading?: boolean;
  onProductSelect?: (product: StoreProduct) => void;
  onServiceSelect?: (service: StoreService) => void;
}>) {
  const hasResults = products.length > 0 || services.length > 0;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="vt-storefront-section-title text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Resultados
        </h2>
      </div>
      {loading ? (
        <p className="vt-storefront-section-panel rounded-[18px] border border-dashed border-[#d9d5cf] bg-white px-4 py-10 text-center text-sm text-slate-500">
          Buscando en el catálogo…
        </p>
      ) : !hasResults ? (
        <p className="vt-storefront-section-panel rounded-[18px] border border-dashed border-[#d9d5cf] bg-white px-4 py-10 text-center text-sm text-slate-500">
          Ningún resultado coincide con tu búsqueda.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
          {products.map((p) => (
            <StorefrontProductCard key={`prd-${p.id}`} p={p} onSelect={onProductSelect} />
          ))}
          {services.map((s) => (
            <StorefrontServiceCard key={`svc-${s.id}`} s={s} onSelect={onServiceSelect} />
          ))}
        </div>
      )}
    </section>
  );
}
