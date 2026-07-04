import { useMemo, useState } from "react";
import { Plus, Share2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";
import {
  affiliatesForStore,
  useStoreAdminExtras,
} from "../logic/storeAdminStore";
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

export function AffiliatesSection({ storeId }: { storeId: string }) {
  const affiliatesAll = useStoreAdminExtras((s) => s.affiliates);
  const addAffiliate = useStoreAdminExtras((s) => s.addAffiliate);
  const setAffiliateActive = useStoreAdminExtras((s) => s.setAffiliateActive);
  const removeAffiliate = useStoreAdminExtras((s) => s.removeAffiliate);

  const affiliates = useMemo(
    () => affiliatesForStore(affiliatesAll, storeId),
    [affiliatesAll, storeId],
  );
  const activeCount = affiliates.filter((a) => a.active).length;

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [commission, setCommission] = useState("10");

  function resetForm() {
    setName("");
    setCode("");
    setCommission("10");
    setShowForm(false);
  }

  function submit() {
    const res = addAffiliate({
      storeId,
      name,
      code,
      commissionPercent: Number(commission) || 0,
    });
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo crear el afiliado.");
      return;
    }
    toast.success("Afiliado creado.");
    resetForm();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Afiliados"
        subtitle="Códigos de afiliado de tu tienda y su comisión por venta."
        actions={
          <AdminPrimaryButton onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} aria-hidden /> Agregar afiliado
          </AdminPrimaryButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Afiliados"
          value={affiliates.length}
          icon={<Share2 size={18} aria-hidden />}
        />
        <SummaryCard
          label="Activos"
          value={activeCount}
          hint={`${affiliates.length - activeCount} inactivos`}
        />
      </div>

      {showForm ? (
        <AdminCard className="p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Nuevo afiliado
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Nombre</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Influencer X"
                className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Código</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PROMO10"
                autoCapitalize="characters"
                className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm uppercase outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Comisión (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminPrimaryButton onClick={submit}>Crear afiliado</AdminPrimaryButton>
            <AdminGhostButton onClick={resetForm}>Cancelar</AdminGhostButton>
          </div>
        </AdminCard>
      ) : null}

      {affiliates.length === 0 ? (
        <AdminEmptyState
          title="Todavía no tienes afiliados"
          hint="Crea códigos de afiliado para que terceros promocionen tu tienda."
        />
      ) : (
        <AdminCard>
          <AdminTableFrame>
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/90 text-xs font-bold uppercase tracking-wider text-gray-600">
                  <th className="whitespace-nowrap px-4 py-3.5">Afiliado</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Código</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Comisión</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Estado</th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {affiliates.map((a) => (
                  <tr key={a.id} className="bg-white hover:bg-gray-50/80">
                    <td className="px-4 py-4 font-bold text-gray-900">
                      {a.name}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800">
                        {a.code}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-gray-900">
                      {a.commissionPercent}%
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <StatusDot ok={a.active} />
                        <span className="font-medium text-gray-800">
                          {a.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={a.active ? "Desactivar" : "Activar"}
                          title={a.active ? "Desactivar" : "Activar"}
                          onClick={() => setAffiliateActive(a.id, !a.active)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                        >
                          {a.active ? (
                            <ToggleRight size={18} aria-hidden />
                          ) : (
                            <ToggleLeft size={18} aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Eliminar afiliado"
                          onClick={() => {
                            removeAffiliate(a.id);
                            toast.success("Afiliado eliminado.");
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
        </AdminCard>
      )}
    </div>
  );
}
