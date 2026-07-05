import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { CeSpinner } from "@shared/components/ui";
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
import {
  profileDividerClass,
  profileFieldLabelClass,
  profileInputClass,
  profilePanelClass,
  profileSectionMutedClass,
} from "@features/profile/logic/profileTabStyles";
import { ProfileButton } from "./ProfileButton";
import { ProfileModal } from "./ProfileModal";

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
  const busy = addMutation.isPending || removeMutation.isPending;

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

  return (
    <ProfileModal
      show={open}
      onClose={() => !busy && onClose()}
      title="Contactos"
      size="2xl"
      footer={
        <ProfileButton variant="secondary" disabled={busy} onClick={onClose}>
          Cerrar
        </ProfileButton>
      }
    >
      <div className={`${profileSectionMutedClass} mb-4`}>
        Solo puedes guardar números que estén registrados en VibeTrade. Al
        añadir uno, validamos el teléfono y mostramos el nombre del perfil.
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-2">
            <span className={profileFieldLabelClass}>Número de teléfono</span>
            <input
              className={profileInputClass}
              type="tel"
              autoComplete="tel"
              placeholder="Ej. +54 9 11 1234-5678"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              disabled={addMutation.isPending}
            />
          </label>
          <ProfileButton
            variant="primary"
            className="shrink-0"
            loading={addMutation.isPending}
            onClick={() => void onAdd()}
          >
            <UserPlus size={16} aria-hidden />
            Añadir
          </ProfileButton>
        </div>
      </div>

      <div className={profileDividerClass} />

      <div className="max-h-[min(52vh,420px)] overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[var(--muted)]">
            <CeSpinner size="md" aria-label="Cargando" />
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className={`py-8 text-center ${profileSectionMutedClass}`}>
            Todavía no tienes contactos guardados.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((c: UserContact) => (
              <li
                key={c.userId}
                className={`${profilePanelClass} flex flex-wrap items-center justify-between gap-2`}
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={profileSectionPath(c.userId, "account")}
                    className="font-bold text-[var(--text)] no-underline hover:underline"
                    onClick={onClose}
                  >
                    {c.displayName?.trim() || "Sin nombre"}
                  </Link>
                  <div className={`${profileSectionMutedClass} mt-0.5 font-mono text-[12px]`}>
                    {contactPhoneLabel(c)}
                  </div>
                  {formatContactAddedAt(c.createdAt) ? (
                    <div className="mt-1 text-[11px] font-semibold text-[var(--muted)]">
                      Añadido: {formatContactAddedAt(c.createdAt)}
                    </div>
                  ) : null}
                </div>
                <ProfileButton
                  variant="danger"
                  size="sm"
                  className="shrink-0"
                  disabled={removeId === c.userId}
                  loading={removeId === c.userId}
                  aria-label={`Eliminar contacto ${c.displayName}`}
                  onClick={() => void onRemove(c.userId)}
                >
                  <Trash2 size={14} aria-hidden />
                  Quitar
                </ProfileButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProfileModal>
  );
}
