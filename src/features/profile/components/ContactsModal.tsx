import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { onBackdropPointerClose } from "@shared/lib/modals/modalClose";
import {
  fieldLabel,
  modalFormBody,
  modalShellWide,
  modalSub,
} from "@shared/styles/modals/formModalStyles";
import { profileSectionPath } from "@features/profile/logic/profilePaths";
import type { UserContact } from "@features/profile/api/contactsApi";
import {
  useAddContactMutation,
  useContacts,
  useRemoveContactMutation,
} from "@features/profile/hooks/useContacts";
import {
  contactPhoneLabel,
  formatContactAddedAt,
} from "@features/profile/logic/contactsDisplay";

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
}>;

export function ContactsModal({ open, onClose }: Props) {
  const contactsQuery = useContacts({ enabled: open });
  const addMutation = useAddContactMutation();
  const removeMutation = useRemoveContactMutation();
  const [phoneDraft, setPhoneDraft] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);

  const items = contactsQuery.data ?? [];
  const loading = contactsQuery.isLoading;

  async function onAdd() {
    const raw = phoneDraft.trim();
    if (!raw) {
      toast.error("Ingresá un número de teléfono.");
      return;
    }
    try {
      const added = await addMutation.mutateAsync(raw);
      setPhoneDraft("");
      toast.success(`${added.displayName || "Contacto"} añadido`);
    } catch (e) {
      toast.error(
        e instanceof Error && e.message ? e.message : "No se pudo añadir el contacto.",
      );
    }
  }

  async function onRemove(userId: string) {
    setRemoveId(userId);
    try {
      await removeMutation.mutateAsync(userId);
      toast.success("Contacto eliminado");
    } catch (e) {
      toast.error(
        e instanceof Error && e.message ? e.message : "No se pudo eliminar.",
      );
    } finally {
      setRemoveId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contacts-modal-title"
      onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
    >
      <div className={modalShellWide} onMouseDown={(e) => e.stopPropagation()}>
        <div className="vt-modal-title" id="contacts-modal-title">
          Contactos
        </div>
        <div className={modalSub}>
          Solo puedes guardar números que estén registrados en VibeTrade. Al
          añadir uno, validamos el teléfono y mostramos el nombre del perfil.
        </div>
        <div className={modalFormBody}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-2">
              <span className={fieldLabel}>Número de teléfono</span>
              <input
                className="vt-input"
                type="tel"
                autoComplete="tel"
                placeholder="Ej. +54 9 11 1234-5678"
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                disabled={addMutation.isPending}
              />
            </label>
            <button
              type="button"
              className="vt-btn vt-btn-primary inline-flex shrink-0 items-center justify-center gap-2"
              disabled={addMutation.isPending}
              onClick={() => void onAdd()}
            >
              {addMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} aria-hidden />
              ) : (
                <UserPlus size={16} aria-hidden />
              )}
              Añadir
            </button>
          </div>
        </div>

        <div className="vt-divider my-3" />

        <div className="max-h-[min(52vh,420px)] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[var(--muted)]">
              <Loader2 className="animate-spin" size={20} aria-hidden />
              Cargando…
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--muted)]">
              Todavía no tienes contactos guardados.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((c: UserContact) => (
                <li
                  key={c.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to={profileSectionPath(c.userId, "account")}
                      className="font-black text-[var(--text)] no-underline hover:underline"
                      onClick={onClose}
                    >
                      {c.displayName?.trim() || "Sin nombre"}
                    </Link>
                    <div className="vt-muted mt-0.5 font-mono text-[12px]">
                      {contactPhoneLabel(c)}
                    </div>
                    {formatContactAddedAt(c.createdAt) ? (
                      <div className="mt-1 text-[11px] font-semibold text-[var(--muted)]">
                        Añadido: {formatContactAddedAt(c.createdAt)}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="vt-btn vt-btn-ghost vt-btn-sm inline-flex shrink-0 items-center gap-1 text-[var(--bad)]"
                    disabled={removeId === c.userId}
                    aria-label={`Eliminar contacto ${c.displayName}`}
                    onClick={() => void onRemove(c.userId)}
                  >
                    {removeId === c.userId ? (
                      <Loader2 className="animate-spin" size={14} aria-hidden />
                    ) : (
                      <Trash2 size={14} aria-hidden />
                    )}
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="vt-modal-actions">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
