import { useMemo, useState, type ReactNode } from "react";
import { Loader2, Plus, Search, ShieldCheck, Trash2, UserCog } from "lucide-react";
import toast from "react-hot-toast";
import { onBackdropPointerClose } from "@shared/lib/modals/modalClose";
import { modalShellWide } from "@shared/styles/modals/formModalStyles";
import {
  ROLE_ADMIN,
  ROLE_AFILIADO,
  ROLE_ALMACEN,
  ROLE_SUPERADMIN,
} from "@features/auth/logic/roles";
import {
  useCreateUser,
  useDeleteUser,
  useSetUserPassword,
  useSetUserRoles,
  useUpdateUser,
  useUsersList,
} from "../hooks/useUsers";
import type { AdminUserDto } from "../Dtos/users";

const ROLE_LABELS: Record<string, string> = {
  [ROLE_SUPERADMIN]: "Superadmin",
  [ROLE_ADMIN]: "Administrador",
  [ROLE_ALMACEN]: "Almacén",
  [ROLE_AFILIADO]: "Afiliado",
};

const ASSIGNABLE: { id: string; label: string }[] = [
  { id: ROLE_ADMIN, label: "Administrador" },
  { id: ROLE_ALMACEN, label: "Almacén" },
  { id: ROLE_AFILIADO, label: "Afiliado" },
];

function Modal({
  title,
  onClose,
  children,
  busy,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => onBackdropPointerClose(e, busy ? () => {} : onClose)}
    >
      <div className={modalShellWide} onMouseDown={(e) => e.stopPropagation()}>
        <div className="vt-modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

function RoleBadges({ roles }: { roles: string[] }) {
  if (roles.length === 0)
    return <span className="vt-muted text-sm">Sin roles</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span
          key={r}
          className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] font-bold"
        >
          {ROLE_LABELS[r] ?? r}
        </span>
      ))}
    </div>
  );
}

export function UsersAdminPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useUsersList(search);

  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const rolesMut = useSetUserRoles();
  const passwordMut = useSetUserPassword();
  const deleteMut = useDeleteUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");

  const [rolesTarget, setRolesTarget] = useState<AdminUserDto | null>(null);
  const [rolesDraft, setRolesDraft] = useState<Set<string>>(new Set());

  const [editTarget, setEditTarget] = useState<AdminUserDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [passwordTarget, setPasswordTarget] = useState<AdminUserDto | null>(null);
  const [passwordValue, setPasswordValue] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AdminUserDto | null>(null);

  const users = useMemo(() => data ?? [], [data]);

  async function onCreate() {
    if (!newEmail.trim() || newPassword.length < 8) {
      toast.error("Indica email y contraseña (mínimo 8 caracteres).");
      return;
    }
    try {
      await createMut.mutateAsync({
        email: newEmail.trim(),
        password: newPassword,
        displayName: newName.trim() || null,
      });
      toast.success("Usuario creado.");
      setCreateOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el usuario.");
    }
  }

  function openRoles(u: AdminUserDto) {
    setRolesTarget(u);
    setRolesDraft(
      new Set(u.roles.filter((r) => ASSIGNABLE.some((a) => a.id === r))),
    );
  }

  async function onSaveRoles() {
    if (!rolesTarget) return;
    try {
      await rolesMut.mutateAsync({
        id: rolesTarget.id,
        body: { roles: [...rolesDraft] },
      });
      toast.success("Roles actualizados.");
      setRolesTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar los roles.");
    }
  }

  function openEdit(u: AdminUserDto) {
    setEditTarget(u);
    setEditName(u.displayName ?? "");
    setEditEmail(u.email ?? "");
  }

  async function onSaveEdit() {
    if (!editTarget) return;
    try {
      await updateMut.mutateAsync({
        id: editTarget.id,
        body: { displayName: editName.trim() || null, email: editEmail.trim() || null },
      });
      toast.success("Usuario actualizado.");
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  }

  async function onSavePassword() {
    if (!passwordTarget) return;
    if (passwordValue.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    try {
      await passwordMut.mutateAsync({
        id: passwordTarget.id,
        body: { newPassword: passwordValue },
      });
      toast.success("Contraseña actualizada.");
      setPasswordTarget(null);
      setPasswordValue("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success("Usuario eliminado.");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  }

  function toggleRole(id: string) {
    setRolesDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="container vt-page">
      <div className="flex items-center gap-2">
        <UserCog />
        <h1 className="vt-h1">Usuarios</h1>
      </div>

      <div className="vt-card vt-card-pad mt-4 flex flex-wrap items-center gap-3">
        <label className="flex flex-1 items-center gap-2">
          <Search size={16} className="vt-muted" />
          <input
            className="vt-input flex-1"
            placeholder="Buscar por nombre, email o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button
          className="vt-btn vt-btn-primary inline-flex items-center gap-2"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin" />
        </div>
      )}
      {isError && (
        <div className="vt-card vt-card-pad mt-4 text-center">
          No se pudieron cargar los usuarios.
        </div>
      )}

      {!isLoading && !isError && (
        <section className="vt-card vt-card-pad mt-4">
          {users.length === 0 ? (
            <div className="vt-muted text-sm">Sin usuarios.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="vt-muted">
                    <th className="p-2">Usuario</th>
                    <th className="p-2">Contacto</th>
                    <th className="p-2">Roles</th>
                    <th className="p-2">Confianza</th>
                    <th className="p-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-[var(--border)]">
                      <td className="p-2">
                        <div className="font-semibold">{u.displayName || "—"}</div>
                        {u.ownsStore ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--primary)]">
                            <ShieldCheck size={12} /> Dueño de tienda
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2">
                        <div>{u.email || "—"}</div>
                        <div className="vt-muted">{u.phoneDisplay || ""}</div>
                      </td>
                      <td className="p-2">
                        <RoleBadges roles={u.roles} />
                      </td>
                      <td className="p-2 tabular-nums">{u.trustScore}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button className="vt-btn vt-btn-sm" onClick={() => openRoles(u)}>
                            Roles
                          </button>
                          <button className="vt-btn vt-btn-sm" onClick={() => openEdit(u)}>
                            Editar
                          </button>
                          <button
                            className="vt-btn vt-btn-sm"
                            onClick={() => {
                              setPasswordTarget(u);
                              setPasswordValue("");
                            }}
                          >
                            Contraseña
                          </button>
                          <button
                            className="vt-btn vt-btn-sm"
                            aria-label="Eliminar"
                            disabled={u.ownsStore}
                            title={u.ownsStore ? "No se puede eliminar un dueño de tienda" : undefined}
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {createOpen && (
        <Modal title="Nuevo usuario" onClose={() => setCreateOpen(false)} busy={createMut.isPending}>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm vt-muted">Email</span>
              <input className="vt-input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm vt-muted">Contraseña (mínimo 8)</span>
              <input className="vt-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm vt-muted">Nombre (opcional)</span>
              <input className="vt-input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </label>
          </div>
          <div className="vt-modal-actions">
            <button className="vt-btn" onClick={() => setCreateOpen(false)} disabled={createMut.isPending}>
              Cancelar
            </button>
            <button className="vt-btn vt-btn-primary" onClick={onCreate} disabled={createMut.isPending}>
              Crear
            </button>
          </div>
        </Modal>
      )}

      {rolesTarget && (
        <Modal
          title={`Roles de ${rolesTarget.displayName || rolesTarget.email || rolesTarget.id}`}
          onClose={() => setRolesTarget(null)}
          busy={rolesMut.isPending}
        >
          <div className="flex flex-col gap-2">
            {rolesTarget.ownsStore ? (
              <p className="vt-muted text-sm">
                Este usuario es dueño de una tienda, por lo que siempre es superadmin.
              </p>
            ) : null}
            {ASSIGNABLE.map((r) => (
              <label key={r.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rolesDraft.has(r.id)}
                  onChange={() => toggleRole(r.id)}
                />
                {r.label}
              </label>
            ))}
          </div>
          <div className="vt-modal-actions">
            <button className="vt-btn" onClick={() => setRolesTarget(null)} disabled={rolesMut.isPending}>
              Cancelar
            </button>
            <button className="vt-btn vt-btn-primary" onClick={onSaveRoles} disabled={rolesMut.isPending}>
              Guardar roles
            </button>
          </div>
        </Modal>
      )}

      {editTarget && (
        <Modal title="Editar usuario" onClose={() => setEditTarget(null)} busy={updateMut.isPending}>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm vt-muted">Nombre</span>
              <input className="vt-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm vt-muted">Email</span>
              <input className="vt-input" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </label>
          </div>
          <div className="vt-modal-actions">
            <button className="vt-btn" onClick={() => setEditTarget(null)} disabled={updateMut.isPending}>
              Cancelar
            </button>
            <button className="vt-btn vt-btn-primary" onClick={onSaveEdit} disabled={updateMut.isPending}>
              Guardar
            </button>
          </div>
        </Modal>
      )}

      {passwordTarget && (
        <Modal title="Cambiar contraseña" onClose={() => setPasswordTarget(null)} busy={passwordMut.isPending}>
          <label className="flex flex-col gap-1">
            <span className="text-sm vt-muted">Nueva contraseña (mínimo 8)</span>
            <input
              className="vt-input"
              type="password"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
            />
          </label>
          <div className="vt-modal-actions">
            <button className="vt-btn" onClick={() => setPasswordTarget(null)} disabled={passwordMut.isPending}>
              Cancelar
            </button>
            <button className="vt-btn vt-btn-primary" onClick={onSavePassword} disabled={passwordMut.isPending}>
              Cambiar
            </button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Eliminar usuario" onClose={() => setDeleteTarget(null)} busy={deleteMut.isPending}>
          <p className="text-sm">
            ¿Eliminar a{" "}
            <strong>{deleteTarget.displayName || deleteTarget.email || deleteTarget.id}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="vt-modal-actions">
            <button className="vt-btn" onClick={() => setDeleteTarget(null)} disabled={deleteMut.isPending}>
              Cancelar
            </button>
            <button className="vt-btn vt-btn-primary" onClick={onDelete} disabled={deleteMut.isPending}>
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
