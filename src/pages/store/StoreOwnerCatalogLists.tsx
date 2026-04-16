import {
  BadgeCheck,
  EyeOff,
  Globe,
  Package,
  Plus,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { cn } from "../../lib/cn";
import type { StoreCatalog, StoreProduct, StoreService } from "../chat/domain/storeCatalogTypes";

export function OwnerCatalogProductList({
  cat,
  productsOverride,
  onAdd,
  onEdit,
  onRemove,
  onTogglePublished,
  onReload,
  catalogReloadBusy,
  className,
  showSectionLabel = true,
}: Readonly<{
  cat: StoreCatalog | undefined;
  /** Si se define, se lista este subconjunto (p. ej. filtrado en la página). */
  productsOverride?: StoreProduct[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onTogglePublished: (id: string, published: boolean) => void;
  onReload: () => void;
  catalogReloadBusy: boolean;
  className?: string;
  showSectionLabel?: boolean;
}>) {
  const rows = productsOverride ?? cat?.products ?? [];
  const totalInCatalog = cat?.products.length ?? 0;

  return (
    <div
      className={cn(
        "mt-3 border-t border-[var(--border)] pt-3",
        className,
      )}
    >
      <div
        className={cn(
          "mb-2 flex flex-wrap items-center gap-2",
          showSectionLabel ? "justify-between" : "justify-end",
        )}
      >
        {showSectionLabel ? (
          <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
            Productos
          </span>
        ) : null}
        <button
          type="button"
          className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1"
          disabled={catalogReloadBusy}
          title="Recargar lista de productos"
          aria-label="Recargar productos"
          onClick={onReload}
        >
          <RefreshCw
            size={14}
            className={catalogReloadBusy ? "animate-spin" : ""}
            aria-hidden
          />
          Recargar
        </button>
      </div>
      {rows.length > 0 ? (
        <ul className="mb-2 space-y-1.5 text-[13px]">
          {rows.map((p: StoreProduct) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface)] px-2 py-1.5"
            >
              <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                <Package
                  size={14}
                  className="shrink-0 opacity-70"
                  aria-hidden
                />
                <span className="truncate font-bold">{p.name}</span>
                <span className="vt-muted truncate">{p.price}</span>
                {p.published ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[color-mix(in_oklab,var(--good)_14%,transparent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-900">
                    <BadgeCheck size={12} aria-hidden /> Publicado
                  </span>
                ) : (
                  <span className="vt-muted inline-flex shrink-0 items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                    Borrador
                  </span>
                )}
              </span>
              <span className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1"
                  onClick={() => {
                    const next = !p.published;
                    onTogglePublished(p.id, next);
                  }}
                >
                  {p.published ? (
                    <>
                      <EyeOff size={14} aria-hidden /> Ocultar
                    </>
                  ) : (
                    <>
                      <Globe size={14} aria-hidden /> Publicar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm"
                  onClick={() => onEdit(p.id)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm text-[#b91c1c]"
                  onClick={() => onRemove(p.id)}
                >
                  Quitar
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="vt-muted mb-2 text-xs">
          {totalInCatalog > 0
            ? "Ningún producto coincide con el filtro."
            : "Sin productos en catálogo."}
        </p>
      )}
      <button
        type="button"
        className="vt-btn vt-btn-sm inline-flex items-center gap-1"
        onClick={onAdd}
      >
        <Plus size={14} /> Añadir producto
      </button>
    </div>
  );
}

export function OwnerCatalogServiceList({
  cat,
  servicesOverride,
  onAdd,
  onEdit,
  onRemove,
  onTogglePublished,
  onReload,
  catalogReloadBusy,
  className,
  showSectionLabel = true,
}: Readonly<{
  cat: StoreCatalog | undefined;
  servicesOverride?: StoreService[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onTogglePublished: (id: string, published: boolean) => void;
  onReload: () => void;
  catalogReloadBusy: boolean;
  className?: string;
  showSectionLabel?: boolean;
}>) {
  const rows = servicesOverride ?? cat?.services ?? [];
  const totalInCatalog = cat?.services.length ?? 0;

  return (
    <div
      className={cn(
        "mt-3 border-t border-[var(--border)] pt-3",
        className,
      )}
    >
      <div
        className={cn(
          "mb-2 flex flex-wrap items-center gap-2",
          showSectionLabel ? "justify-between" : "justify-end",
        )}
      >
        {showSectionLabel ? (
          <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
            Servicios
          </span>
        ) : null}
        <button
          type="button"
          className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1"
          disabled={catalogReloadBusy}
          title="Recargar lista de servicios"
          aria-label="Recargar servicios"
          onClick={onReload}
        >
          <RefreshCw
            size={14}
            className={catalogReloadBusy ? "animate-spin" : ""}
            aria-hidden
          />
          Recargar
        </button>
      </div>
      {rows.length > 0 ? (
        <ul className="mb-2 space-y-1.5 text-[13px]">
          {rows.map((sv: StoreService) => {
            const pub = sv.published !== false;
            return (
              <li
                key={sv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface)] px-2 py-1.5"
              >
                <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                  <Wrench size={14} className="shrink-0 opacity-70" aria-hidden />
                  <span className="truncate font-bold">{sv.tipoServicio}</span>
                  {pub ? (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[color-mix(in_oklab,var(--good)_14%,transparent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-900">
                      <BadgeCheck size={12} aria-hidden /> Publicado
                    </span>
                  ) : (
                    <span className="vt-muted inline-flex shrink-0 items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                      Borrador
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1"
                    onClick={() => {
                      onTogglePublished(sv.id, !pub);
                    }}
                  >
                    {pub ? (
                      <>
                        <EyeOff size={14} aria-hidden /> Ocultar
                      </>
                    ) : (
                      <>
                        <Globe size={14} aria-hidden /> Publicar
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="vt-btn vt-btn-ghost vt-btn-sm"
                    onClick={() => onEdit(sv.id)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="vt-btn vt-btn-ghost vt-btn-sm text-[#b91c1c]"
                    onClick={() => onRemove(sv.id)}
                  >
                    Quitar
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="vt-muted mb-2 text-xs">
          {totalInCatalog > 0
            ? "Ningún servicio coincide con el filtro."
            : "Sin servicios en catálogo."}
        </p>
      )}
      <button
        type="button"
        className="vt-btn vt-btn-sm inline-flex items-center gap-1"
        onClick={onAdd}
      >
        <Plus size={14} /> Añadir servicio
      </button>
    </div>
  );
}
