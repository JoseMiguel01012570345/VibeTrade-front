import type { StoreService } from "@features/market/logic/storeCatalogTypes";
import { StorefrontServiceCard } from "./StorefrontServiceCard";

export function StorefrontServicesSection({
  heading,
  services,
}: Readonly<{
  heading: string;
  services: StoreService[];
}>) {
  return (
    <section id="storefront-servicios" className="scroll-mt-24">
      <div className="mb-5">
        <h2 className="vt-storefront-section-title text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          {heading}
        </h2>
      </div>
      {services.length === 0 ? (
        <p className="vt-storefront-section-panel rounded-[18px] border border-dashed border-[#d9d5cf] bg-white px-4 py-10 text-center text-sm text-slate-500">
          Esta tienda todavía no publicó servicios.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
          {services.map((s) => (
            <StorefrontServiceCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </section>
  );
}
