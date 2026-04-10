import { VtMultiSelect } from "../../components/VtMultiSelect";
import { VtSelect } from "../../components/VtSelect";
import { cn } from "../../lib/cn";
import { PriceRangeMinMaxControls } from "./PriceRangeMinMaxControls";
import {
  CATALOG_PUBLISHED_FILTER_OPTIONS,
  PRODUCT_CONDITION_FILTER_OPTIONS,
  type CatalogPublishedFilter,
  type PriceSort,
  type VitrinaListMode,
} from "./storePageTypes";

export function VitrinaFiltersCard({
  vitrinaListMode,
  onVitrinaListMode,
  productNameQ,
  onProductNameQ,
  productCategory,
  onProductCategory,
  productCategories,
  productCondition,
  onProductCondition,
  serviceNameQ,
  onServiceNameQ,
  serviceCategory,
  onServiceCategory,
  serviceCategories,
  priceSort,
  onPriceSort,
  priceFloor,
  priceCeiling,
  onPriceFloor,
  onPriceCeiling,
  priceSliderMax,
  acceptedMonedaQ,
  onAcceptedMonedaQ,
  acceptedMonedaOptions,
  showPublishedFilter,
  catalogPublishedFilter,
  onCatalogPublishedFilter,
}: Readonly<{
  vitrinaListMode: VitrinaListMode;
  onVitrinaListMode: (v: VitrinaListMode) => void;
  productNameQ: string;
  onProductNameQ: (v: string) => void;
  productCategory: string;
  onProductCategory: (v: string) => void;
  productCategories: string[];
  productCondition: string;
  onProductCondition: (v: string) => void;
  serviceNameQ: string;
  onServiceNameQ: (v: string) => void;
  serviceCategory: string;
  onServiceCategory: (v: string) => void;
  serviceCategories: string[];
  priceSort: PriceSort;
  onPriceSort: (v: PriceSort) => void;
  priceFloor: number | null;
  priceCeiling: number | null;
  onPriceFloor: (v: number) => void;
  onPriceCeiling: (v: number) => void;
  priceSliderMax: number;
  acceptedMonedaQ: readonly string[];
  onAcceptedMonedaQ: (v: string[]) => void;
  acceptedMonedaOptions: string[];
  showPublishedFilter: boolean;
  catalogPublishedFilter: CatalogPublishedFilter;
  onCatalogPublishedFilter: (v: CatalogPublishedFilter) => void;
}>) {
  const showProducts = vitrinaListMode !== "services";
  const showServices = vitrinaListMode !== "products";

  return (
    <div className="vt-card vt-card-pad">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        Filtrar vitrina
      </div>
      <p className="vt-muted mt-1 text-[12px] leading-snug">
        Nombre, categoría y estado (productos) para productos y servicios. Podés
        acotar por una o varias monedas aceptadas. El precio filtra ambos: productos
        por su precio; servicios por importes detectados en el texto.
      </p>
      <div className="vt-divider my-3" />
      <div className="max-w-md">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
          Mostrar en catálogo
        </div>
        <div className="mt-2">
          <VtSelect
            value={vitrinaListMode}
            onChange={(v) => onVitrinaListMode(v as VitrinaListMode)}
            ariaLabel="Mostrar productos, servicios o ambos"
            placeholder="Vista"
            options={[
              { value: "both", label: "Productos y servicios" },
              { value: "products", label: "Solo productos" },
              { value: "services", label: "Solo servicios" },
            ]}
          />
        </div>
      </div>
      {showPublishedFilter ? (
        <>
          <div className="vt-divider my-3" />
          <div className="max-w-md">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
              Publicación en vitrina
            </div>
            <div className="mt-2">
              <VtSelect
                value={catalogPublishedFilter}
                onChange={(v) =>
                  onCatalogPublishedFilter(v as CatalogPublishedFilter)
                }
                ariaLabel="Filtrar por publicados o borradores"
                placeholder="Visibilidad"
                options={[...CATALOG_PUBLISHED_FILTER_OPTIONS]}
              />
            </div>
          </div>
        </>
      ) : null}
      <div className="vt-divider my-3" />
      <div
        className={cn(
          "grid gap-4",
          showProducts && showServices && "min-[640px]:grid-cols-2",
        )}
      >
        {showProducts ? (
          <div>
            <div className="text-xs font-bold text-[var(--muted)]">
              Productos
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="search"
                className="vt-input w-full min-w-0"
                placeholder="Nombre o modelo…"
                value={productNameQ}
                onChange={(e) => onProductNameQ(e.target.value)}
                aria-label="Filtrar productos por nombre o modelo"
              />
              <div className="grid gap-2 min-[480px]:grid-cols-2">
                <VtSelect
                  value={productCategory}
                  onChange={onProductCategory}
                  ariaLabel="Filtrar productos por categoría"
                  placeholder="Todas las categorías"
                  options={[
                    { value: "", label: "Todas las categorías" },
                    ...productCategories.map((c) => ({ value: c, label: c })),
                  ]}
                />
                <VtSelect
                  value={productCondition}
                  onChange={onProductCondition}
                  ariaLabel="Filtrar productos por estado"
                  placeholder="Todos los estados"
                  options={[...PRODUCT_CONDITION_FILTER_OPTIONS]}
                />
              </div>
            </div>
          </div>
        ) : null}
        {showServices ? (
          <div>
            <div className="text-xs font-bold text-[var(--muted)]">
              Servicios
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="search"
                className="vt-input w-full min-w-0"
                placeholder="Nombre o tipo…"
                value={serviceNameQ}
                onChange={(e) => onServiceNameQ(e.target.value)}
                aria-label="Filtrar servicios por nombre"
              />
              <div className="min-[480px]:max-w-md">
                <VtSelect
                  value={serviceCategory}
                  onChange={onServiceCategory}
                  ariaLabel="Filtrar servicios por categoría"
                  placeholder="Todas las categorías"
                  options={[
                    { value: "", label: "Todas las categorías" },
                    ...serviceCategories.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="vt-divider my-3" />
      <div className="max-w-md">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
          Monedas aceptadas
        </div>
        <div className="mt-2">
          <VtMultiSelect
            value={acceptedMonedaQ}
            onChange={onAcceptedMonedaQ}
            ariaLabel="Filtrar por monedas aceptadas en productos y servicios"
            placeholder="Todas las monedas"
            options={acceptedMonedaOptions.map((c) => ({ value: c, label: c }))}
          />
        </div>
      </div>
      <div className="vt-divider my-3" />
      <div className="grid gap-3 min-[560px]:grid-cols-2">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            Orden por precio (productos y servicios)
          </div>
          <div className="mt-2">
            <VtSelect
              value={priceSort}
              onChange={(v) => onPriceSort(v as PriceSort)}
              ariaLabel="Ordenar por precio en vitrina"
              placeholder="Orden"
              options={[
                { value: "none", label: "Sin orden por precio" },
                { value: "asc", label: "Precio: menor a mayor" },
                { value: "desc", label: "Precio: mayor a menor" },
              ]}
            />
          </div>
        </div>
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            Rango de precio (0 — máximo del catálogo)
          </div>
          <PriceRangeMinMaxControls
            priceSliderMax={priceSliderMax}
            priceFloor={priceFloor}
            priceCeiling={priceCeiling}
            onPriceFloor={onPriceFloor}
            onPriceCeiling={onPriceCeiling}
            helperText="Máximo del catálogo = mayor precio entre productos publicados y servicios (estimado desde texto)."
          />
        </div>
      </div>
    </div>
  );
}
