import { VtMultiSelect } from "../../components/VtMultiSelect";
import { VtSelect } from "../../components/VtSelect";
import { PriceRangeMinMaxControls } from "./PriceRangeMinMaxControls";
import {
  CATALOG_PUBLISHED_FILTER_OPTIONS,
  PRODUCT_CONDITION_FILTER_OPTIONS,
  type CatalogPublishedFilter,
  type PriceSort,
} from "./storePageTypes";

export function ProductFiltersCard({
  productNameQ,
  onProductNameQ,
  productCategory,
  onProductCategory,
  productCategories,
  productCondition,
  onProductCondition,
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
  productNameQ: string;
  onProductNameQ: (v: string) => void;
  productCategory: string;
  onProductCategory: (v: string) => void;
  productCategories: string[];
  productCondition: string;
  onProductCondition: (v: string) => void;
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
  return (
    <div className="vt-card vt-card-pad">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        Filtrar productos
      </div>
      <p className="vt-muted mt-1 text-[12px] leading-snug">
        Por nombre, modelo, categoría, estado, monedas aceptadas y precio.
      </p>
      <div className="vt-divider my-3" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          className="vt-input min-w-0 flex-1"
          placeholder="Nombre o modelo…"
          value={productNameQ}
          onChange={(e) => onProductNameQ(e.target.value)}
          aria-label="Filtrar productos por nombre o modelo"
        />
        <div className="sm:w-48">
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
        </div>
        <div className="sm:w-48">
          <VtSelect
            value={productCondition}
            onChange={onProductCondition}
            ariaLabel="Filtrar productos por estado"
            placeholder="Todos los estados"
            options={[...PRODUCT_CONDITION_FILTER_OPTIONS]}
          />
        </div>
        <div className="min-w-0 sm:w-52">
          <VtMultiSelect
            value={acceptedMonedaQ}
            onChange={onAcceptedMonedaQ}
            ariaLabel="Filtrar productos por monedas aceptadas"
            placeholder="Todas las monedas"
            options={acceptedMonedaOptions.map((c) => ({ value: c, label: c }))}
          />
        </div>
        {showPublishedFilter ? (
          <div className="min-w-0 sm:w-56">
            <VtSelect
              value={catalogPublishedFilter}
              onChange={(v) =>
                onCatalogPublishedFilter(v as CatalogPublishedFilter)
              }
              ariaLabel="Filtrar productos por publicación"
              placeholder="Publicación"
              options={[...CATALOG_PUBLISHED_FILTER_OPTIONS]}
            />
          </div>
        ) : null}
      </div>
      <div className="vt-divider my-3" />
      <div className="grid gap-3 min-[560px]:grid-cols-2">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            Orden por precio
          </div>
          <div className="mt-2">
            <VtSelect
              value={priceSort}
              onChange={(v) => onPriceSort(v as PriceSort)}
              ariaLabel="Ordenar productos por precio"
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
            helperText="Productos sin precio numérico no se excluyen por rango."
          />
        </div>
      </div>
    </div>
  );
}
