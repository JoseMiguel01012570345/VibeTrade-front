import type { StoreProduct } from "@features/market/logic/storeCatalogTypes";
import { StorefrontProductCard } from "./StorefrontProductCard";

export function StorefrontProductsSection({
  heading,
  products,
  hasAnyPublished,
}: Readonly<{
  heading: string;
  products: StoreProduct[];
  hasAnyPublished: boolean;
}>) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          {heading}
        </h2>
      </div>
      {products.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-[#d9d5cf] bg-white px-4 py-10 text-center text-sm text-slate-500">
          {hasAnyPublished
            ? "Ningún producto coincide con tu búsqueda."
            : "Esta tienda todavía no publicó productos."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
            {products.map((p) => (
              <StorefrontProductCard key={p.id} p={p} />
            ))}
          </div>
      )}
    </section>
  );
}
