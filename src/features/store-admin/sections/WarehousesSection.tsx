import { useMemo, useState } from "react";
import { Boxes, MapPin, Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import {
  useStoreAdminExtras,
  warehousesForStore,
} from "../logic/storeAdminStore";
import {
  AdminCard,
  AdminEmptyState,
  AdminGhostButton,
  AdminPrimaryButton,
  AdminTableFooter,
  AdminTableFrame,
  adminTableBodyClass,
  adminTableClass,
  adminTableHeadRowClass,
  SectionHeader,
  StatusDot,
  SummaryCard,
} from "../components/StoreAdminUi";
import {
  DEFAULT_ADMIN_PAGE_SIZE,
  usePagedSlice,
} from "../logic/usePagedSlice";

export function WarehousesSection({
  storeId,
  store,
}: {
  storeId: string;
  store: StoreBadge;
}) {
  const warehousesAll = useStoreAdminExtras((s) => s.warehouses);
  const addWarehouse = useStoreAdminExtras((s) => s.addWarehouse);
  const setWarehouseActive = useStoreAdminExtras((s) => s.setWarehouseActive);
  const removeWarehouse = useStoreAdminExtras((s) => s.removeWarehouse);

  const warehouses = useMemo(
    () => warehousesForStore(warehousesAll, storeId),
    [warehousesAll, storeId],
  );
  const activeCount = warehouses.filter((w) => w.active).length;

  const pg = usePagedSlice(warehouses, DEFAULT_ADMIN_PAGE_SIZE, [warehouses.length]);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  function resetForm() {
    setName("");
    setAddress("");
    setShowForm(false);
  }

  function submit() {
    if (!name.trim()) {
      toast.error("El nombre del almacén es obligatorio.");
      return;
    }
    addWarehouse({ storeId, name, address });
    toast.success("Almacén agregado.");
    resetForm();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Almacenes"
        subtitle="Puntos de despacho y almacenamiento desde los que operas tu tienda."
        actions={
          <AdminPrimaryButton onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} aria-hidden /> Agregar almacén
          </AdminPrimaryButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Almacenes"
          value={warehouses.length}
          icon={<Boxes size={18} aria-hidden />}
        />
        <SummaryCard
          label="Activos"
          value={activeCount}
          hint={`${warehouses.length - activeCount} inactivos`}
        />
      </div>

      {store.location ? (
        <AdminCard className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <MapPin size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              Ubicación principal de la tienda
            </p>
            <p className="truncate text-sm text-gray-500">
              {store.location.lat.toFixed(5)}, {store.location.lng.toFixed(5)}
            </p>
          </div>
        </AdminCard>
      ) : null}

      {showForm ? (
        <AdminCard className="p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Nuevo almacén
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Nombre</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Almacén Central"
                className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Dirección</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle, ciudad…"
                className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminPrimaryButton onClick={submit}>Agregar</AdminPrimaryButton>
            <AdminGhostButton onClick={resetForm}>Cancelar</AdminGhostButton>
          </div>
        </AdminCard>
      ) : null}

      {warehouses.length === 0 ? (
        <AdminEmptyState
          title="Todavía no tienes almacenes"
          hint="Agrega puntos de despacho para organizar la logística de tus pedidos."
        />
      ) : (
        <AdminCard>
          <AdminTableFrame>
            <table className={`${adminTableClass} min-w-[36rem]`}>
              <thead>
                <tr className={adminTableHeadRowClass}>
                  <th className="whitespace-nowrap px-4 py-3.5">Almacén</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Dirección</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Estado</th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className={adminTableBodyClass}>
                {pg.slice.map((w) => (
                  <tr key={w.id} className="bg-white hover:bg-gray-50/80">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          <Boxes size={16} aria-hidden />
                        </span>
                        <span className="font-bold text-gray-900">{w.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {w.address || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <StatusDot ok={w.active} />
                        <span className="font-medium text-gray-800">
                          {w.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={w.active ? "Desactivar" : "Activar"}
                          title={w.active ? "Desactivar" : "Activar"}
                          onClick={() => setWarehouseActive(w.id, !w.active)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                        >
                          {w.active ? (
                            <ToggleRight size={18} aria-hidden />
                          ) : (
                            <ToggleLeft size={18} aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Eliminar almacén"
                          onClick={() => {
                            removeWarehouse(w.id);
                            toast.success("Almacén eliminado.");
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableFrame>
          <AdminTableFooter
            page={pg.page}
            totalPages={pg.totalPages}
            totalItems={pg.total}
            onPageChange={pg.setPage}
            itemLabel="almacenes"
          />
        </AdminCard>
      )}
    </div>
  );
}
