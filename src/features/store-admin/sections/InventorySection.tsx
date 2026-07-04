import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  EyeOff,
  Filter,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { StoreProduct } from "@features/market/logic/storeCatalogTypes";
import { catalogMonedasList } from "@features/market/logic/storeCatalogTypes";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { downloadCsv } from "../logic/exportCsv";
import {
  AdminCard,
  AdminEmptyState,
  AdminGhostButton,
  AdminPrimaryButton,
  AdminTableFrame,
  SectionHeader,
  StatusDot,
  SummaryCard,
} from "../components/StoreAdminUi";

type PublishedFilter = "all" | "published" | "draft";

export function InventorySection({
  products,
  onAdd,
  onEdit,
  onRemove,
  onTogglePublish,
}: {
  products: StoreProduct[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onTogglePublish: (id: string, published: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [published, setPublished] = useState<PublishedFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.map((p) => p.category.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category.trim() !== category) return false;
      if (published === "published" && !p.published) return false;
      if (published === "draft" && p.published) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.model ?? "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, query, category, published]);

  const publishedCount = useMemo(
    () => products.filter((p) => p.published).length,
    [products],
  );

  function exportCsv() {
    downloadCsv(
      "productos.csv",
      ["ID", "Nombre", "Categoría", "Precio", "Moneda", "Disponibilidad", "Publicado"],
      filtered.map((p) => [
        p.id,
        p.name,
        p.category,
        p.price,
        catalogMonedasList(p).join(" / "),
        p.availability,
        p.published ? "Sí" : "No",
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Productos"
        subtitle="Gestiona el catálogo de productos de tu tienda."
        actions={
          <>
            <AdminGhostButton onClick={() => setShowFilters((v) => !v)}>
              <Filter size={16} aria-hidden /> Filtros
            </AdminGhostButton>
            <AdminGhostButton onClick={exportCsv}>
              <Download size={16} aria-hidden /> Exportar
            </AdminGhostButton>
            <AdminPrimaryButton onClick={onAdd}>
              <Plus size={16} aria-hidden /> Agregar producto
            </AdminPrimaryButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Total productos"
          value={products.length}
          icon={<Package size={18} aria-hidden />}
        />
        <SummaryCard
          label="Publicados"
          value={publishedCount}
          hint={`${products.length - publishedCount} en borrador`}
          icon={<Eye size={18} aria-hidden />}
        />
        <SummaryCard
          label="Categorías"
          value={categories.length}
        />
      </div>

      {showFilters ? (
        <AdminCard className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o modelo…"
              className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={published}
              onChange={(e) => setPublished(e.target.value as PublishedFilter)}
              className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">Todos los estados</option>
              <option value="published">Publicados</option>
              <option value="draft">Borradores</option>
            </select>
          </div>
        </AdminCard>
      ) : null}

      {filtered.length === 0 ? (
        <AdminEmptyState
          title={
            products.length === 0
              ? "Todavía no tienes productos"
              : "Ningún producto coincide con los filtros"
          }
          hint={
            products.length === 0
              ? "Usa “Agregar producto” para crear tu primera ficha."
              : undefined
          }
        />
      ) : (
        <AdminCard>
          <AdminTableFrame>
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/90 text-xs font-bold uppercase tracking-wider text-gray-600">
                  <th className="whitespace-nowrap px-4 py-3.5">Producto</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Categoría</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Precio</th>
                  <th className="whitespace-nowrap px-4 py-3.5">
                    Disponibilidad
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5">Publicado</th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => {
                  const available = p.availability.trim().length > 0;
                  const monedas = catalogMonedasList(p);
                  const precioMoneda = p.monedaPrecio?.trim() || monedas[0] || "";
                  return (
                    <tr
                      key={p.id}
                      className="bg-white transition-colors hover:bg-gray-50/80"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {p.photoUrls[0] ? (
                            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                              <ProtectedMediaImg
                                src={p.photoUrls[0]}
                                alt=""
                                wrapperClassName="h-full w-full"
                                className="h-full w-full object-cover"
                              />
                            </span>
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                              <Package size={18} aria-hidden />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-bold text-gray-900">
                              {p.name}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {p.model ? `${p.model} · ` : ""}ID:{" "}
                              {p.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {p.category || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-gray-900">
                        {p.price}
                        {precioMoneda ? (
                          <span className="ml-1 text-gray-500">
                            {precioMoneda}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <StatusDot ok={available} />
                          <span className="max-w-[12rem] truncate font-medium text-gray-800">
                            {p.availability.trim() || "Consultar"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {p.published ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            Publicado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                            Borrador
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            aria-label={
                              p.published
                                ? "Ocultar producto"
                                : "Publicar producto"
                            }
                            title={p.published ? "Ocultar" : "Publicar"}
                            onClick={() => onTogglePublish(p.id, !p.published)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                          >
                            {p.published ? (
                              <EyeOff size={16} aria-hidden />
                            ) : (
                              <Eye size={16} aria-hidden />
                            )}
                          </button>
                          <button
                            type="button"
                            aria-label="Editar producto"
                            onClick={() => onEdit(p.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                          >
                            <Pencil size={16} aria-hidden />
                          </button>
                          <button
                            type="button"
                            aria-label="Eliminar producto"
                            onClick={() => onRemove(p.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 size={16} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </AdminTableFrame>
          <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            Mostrando {filtered.length} de {products.length} productos
          </div>
        </AdminCard>
      )}
    </div>
  );
}
