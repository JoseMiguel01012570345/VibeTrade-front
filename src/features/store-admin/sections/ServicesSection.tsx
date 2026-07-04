import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  EyeOff,
  Filter,
  Pencil,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import type { StoreService } from "@features/market/logic/storeCatalogTypes";
import { downloadCsv } from "../logic/exportCsv";
import {
  AdminCard,
  AdminEmptyState,
  AdminGhostButton,
  AdminPrimaryButton,
  AdminTableFrame,
  SectionHeader,
  SummaryCard,
} from "../components/StoreAdminUi";

type PublishedFilter = "all" | "published" | "draft";

function isPublished(s: StoreService): boolean {
  return s.published !== false;
}

export function ServicesSection({
  services,
  onAdd,
  onEdit,
  onRemove,
  onTogglePublish,
}: {
  services: StoreService[];
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
        new Set(services.map((s) => s.category.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [services],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      if (category && s.category.trim() !== category) return false;
      if (published === "published" && !isPublished(s)) return false;
      if (published === "draft" && isPublished(s)) return false;
      if (!q) return true;
      return (
        s.nombreServicio.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.descripcion.toLowerCase().includes(q)
      );
    });
  }, [services, query, category, published]);

  const publishedCount = useMemo(
    () => services.filter(isPublished).length,
    [services],
  );

  function exportCsv() {
    downloadCsv(
      "servicios.csv",
      ["ID", "Servicio", "Categoría", "Moneda", "Publicado"],
      filtered.map((s) => [
        s.id,
        s.nombreServicio,
        s.category,
        (s.currencyCode ?? "USD").trim().toUpperCase() || "USD",
        isPublished(s) ? "Sí" : "No",
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Servicios"
        subtitle="Gestiona el catálogo de servicios de tu tienda."
        actions={
          <>
            <AdminGhostButton onClick={() => setShowFilters((v) => !v)}>
              <Filter size={16} aria-hidden /> Filtros
            </AdminGhostButton>
            <AdminGhostButton onClick={exportCsv}>
              <Download size={16} aria-hidden /> Exportar
            </AdminGhostButton>
            <AdminPrimaryButton onClick={onAdd}>
              <Plus size={16} aria-hidden /> Agregar servicio
            </AdminPrimaryButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Total servicios"
          value={services.length}
          icon={<Wrench size={18} aria-hidden />}
        />
        <SummaryCard
          label="Publicados"
          value={publishedCount}
          hint={`${services.length - publishedCount} en borrador`}
          icon={<Eye size={18} aria-hidden />}
        />
        <SummaryCard label="Categorías" value={categories.length} />
      </div>

      {showFilters ? (
        <AdminCard className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por tipo o descripción…"
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
            services.length === 0
              ? "Todavía no tienes servicios"
              : "Ningún servicio coincide con los filtros"
          }
          hint={
            services.length === 0
              ? "Usa “Agregar servicio” para crear tu primera ficha."
              : undefined
          }
        />
      ) : (
        <AdminCard>
          <AdminTableFrame>
            <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/90 text-xs font-bold uppercase tracking-wider text-gray-600">
                  <th className="whitespace-nowrap px-4 py-3.5">Servicio</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Categoría</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Publicado</th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => {
                  const pub = isPublished(s);
                  return (
                    <tr
                      key={s.id}
                      className="bg-white transition-colors hover:bg-gray-50/80"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                            <Wrench size={18} aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-gray-900">
                              {s.nombreServicio}
                            </p>
                            <p className="max-w-[22rem] truncate text-xs text-gray-500">
                              {s.descripcion || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {s.category || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {pub ? (
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
                            aria-label={pub ? "Ocultar servicio" : "Publicar servicio"}
                            title={pub ? "Ocultar" : "Publicar"}
                            onClick={() => onTogglePublish(s.id, !pub)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                          >
                            {pub ? (
                              <EyeOff size={16} aria-hidden />
                            ) : (
                              <Eye size={16} aria-hidden />
                            )}
                          </button>
                          <button
                            type="button"
                            aria-label="Editar servicio"
                            onClick={() => onEdit(s.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                          >
                            <Pencil size={16} aria-hidden />
                          </button>
                          <button
                            type="button"
                            aria-label="Eliminar servicio"
                            onClick={() => onRemove(s.id)}
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
            Mostrando {filtered.length} de {services.length} servicios
          </div>
        </AdminCard>
      )}
    </div>
  );
}
