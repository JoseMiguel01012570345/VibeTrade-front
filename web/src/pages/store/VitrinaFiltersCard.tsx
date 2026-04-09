import { VtSelect } from "../../components/VtSelect";
import { PriceRangeMinMaxControls } from "./PriceRangeMinMaxControls";
import {
  PRODUCT_CONDITION_FILTER_OPTIONS,
  type PriceSort,
} from "./storePageTypes";

export function VitrinaFiltersCard({
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
}: Readonly<{
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
}>) {
  return (
    <div className="vt-card vt-card-pad">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        Filtrar vitrina
      </div>
      <p className="vt-muted mt-1 text-[12px] leading-snug">
        Nombre, categoría y estado (productos) para productos y servicios. El
        precio filtra ambos: productos por su precio; servicios por importes
        detectados en el texto.
      </p>
      <div className="vt-divider my-3" />
      <div className="grid gap-4 min-[640px]:grid-cols-2">
        <div>
          <div className="text-xs font-bold text-[var(--muted)]">Productos</div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
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
          </div>
        </div>
        <div>
          <div className="text-xs font-bold text-[var(--muted)]">Servicios</div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              className="vt-input min-w-0 flex-1"
              placeholder="Nombre o tipo…"
              value={serviceNameQ}
              onChange={(e) => onServiceNameQ(e.target.value)}
              aria-label="Filtrar servicios por nombre"
            />
            <div className="sm:w-48">
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
