import { useMemo, useState } from "react";
import { KeyRound, Plus, Trash2, UserCheck, UserX, Users } from "lucide-react";
import toast from "react-hot-toast";
import {
  staffForStore,
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

export function UsersSection({ storeId }: { storeId: string }) {
  const staffAll = useStoreAdminExtras((s) => s.staff);
  const addStaff = useStoreAdminExtras((s) => s.addStaff);
  const updateStaffPassword = useStoreAdminExtras((s) => s.updateStaffPassword);
  const setStaffActive = useStoreAdminExtras((s) => s.setStaffActive);
  const removeStaff = useStoreAdminExtras((s) => s.removeStaff);

  const staff = useMemo(
    () => staffForStore(staffAll, storeId),
    [staffAll, storeId],
  );
  const activeCount = staff.filter((s) => s.active).length;

  const [showForm, setShowForm] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function resetForm() {
    setDisplayName("");
    setUsername("");
    setPassword("");
    setShowForm(false);
  }

  function submit() {
    const res = addStaff({ storeId, username, password, displayName });
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo crear el usuario.");
      return;
    }
    toast.success("Personal creado. Ya puede iniciar sesión en el panel.");
    resetForm();
  }

  function resetPassword(id: string) {
    const next = window.prompt("Nueva contraseña para este usuario:");
    if (!next) return;
    if (next.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    updateStaffPassword(id, next);
    toast.success("Contraseña actualizada.");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Usuarios"
        subtitle="Personal de la tienda. Inician sesión con usuario y contraseña y solo acceden a este panel."
        actions={
          <AdminPrimaryButton onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} aria-hidden /> Agregar usuario
          </AdminPrimaryButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Total personal"
          value={staff.length}
          icon={<Users size={18} aria-hidden />}
        />
        <SummaryCard
          label="Activos"
          value={activeCount}
          hint={`${staff.length - activeCount} inactivos`}
          icon={<UserCheck size={18} aria-hidden />}
        />
      </div>

      {showForm ? (
        <AdminCard className="p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Nuevo miembro del personal
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Nombre</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Ana Pérez"
                className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Usuario</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="usuario"
                autoCapitalize="none"
                className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Contraseña</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminPrimaryButton onClick={submit}>Crear usuario</AdminPrimaryButton>
            <AdminGhostButton onClick={resetForm}>Cancelar</AdminGhostButton>
          </div>
        </AdminCard>
      ) : null}

      {staff.length === 0 ? (
        <AdminEmptyState
          title="Todavía no tienes personal"
          hint="Crea usuarios para que tu equipo gestione la tienda desde el panel."
        />
      ) : (
        <AdminCard>
          <AdminTableFrame>
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/90 text-xs font-bold uppercase tracking-wider text-gray-600">
                  <th className="whitespace-nowrap px-4 py-3.5">Usuario</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Nombre</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Estado</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Creado</th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((s) => (
                  <tr key={s.id} className="bg-white hover:bg-gray-50/80">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                          {s.displayName.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-bold text-gray-900">
                          {s.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">{s.displayName}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <StatusDot ok={s.active} />
                        <span className="font-medium text-gray-800">
                          {s.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label="Restablecer contraseña"
                          title="Restablecer contraseña"
                          onClick={() => resetPassword(s.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                        >
                          <KeyRound size={16} aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label={s.active ? "Desactivar" : "Activar"}
                          title={s.active ? "Desactivar" : "Activar"}
                          onClick={() => setStaffActive(s.id, !s.active)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                        >
                          {s.active ? (
                            <UserX size={16} aria-hidden />
                          ) : (
                            <UserCheck size={16} aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Eliminar usuario"
                          onClick={() => {
                            removeStaff(s.id);
                            toast.success("Usuario eliminado.");
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
