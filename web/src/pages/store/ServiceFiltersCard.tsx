import { VtMultiSelect } from "../../components/VtMultiSelect";
import { VtSelect } from "../../components/VtSelect";
import { PriceRangeMinMaxControls } from "./PriceRangeMinMaxControls";
import {
  CATALOG_PUBLISHED_FILTER_OPTIONS,
  type CatalogPublishedFilter,
  type PriceSort,
} from "./storePageTypes";

export function ServiceFiltersCard({
  serviceNameQ,
  onServiceNameQ,
  serviceCategoryQ,
  onServiceCategoryQ,
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
  serviceNameQ: string;
  onServiceNameQ: (v: string) => void;
  serviceCategoryQ: readonly string[];
  onServiceCategoryQ: (v: string[]) => void;
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
  return (
    <div className="vt-card vt-card-pad">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        Filtrar servicios
      </div>
      <p className="vt-muted mt-1 text-[12px] leading-snug">
        Por nombre, tipo, categoría, monedas aceptadas y precio inferido del texto.
      </p>
      <div className="vt-divider my-3" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          className="vt-input min-w-0 flex-1"
          placeholder="Nombre o tipo…"
          value={serviceNameQ}
          onChange={(e) => onServiceNameQ(e.target.value)}
          aria-label="Filtrar servicios por nombre o tipo"
        />
        <div className="min-w-0 sm:w-60">
          <VtMultiSelect
            value={serviceCategoryQ}
            onChange={onServiceCategoryQ}
            ariaLabel="Filtrar servicios por categoría"
            placeholder="Todas las categorías"
            options={serviceCategories.map((c) => ({ value: c, label: c }))}
          />
        </div>
        <div className="min-w-0 sm:w-52">
          <VtMultiSelect
            value={acceptedMonedaQ}
            onChange={onAcceptedMonedaQ}
            ariaLabel="Filtrar servicios por monedas aceptadas"
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
              ariaLabel="Filtrar servicios por publicación"
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
              ariaLabel="Ordenar servicios por precio estimado"
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
            helperText="El precio se estima desde el texto de la ficha (p. ej. importes en la descripción). Sin número detectable: no se excluye por rango."
          />
        </div>
      </div>
    </div>
  );
}
