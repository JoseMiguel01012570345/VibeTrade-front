import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Users } from "lucide-react";
import { onBackdropPointerClose } from '../../model/modalClose';
import {
  fieldLabel,
  modalFormBody,
  modalShellWide,
  modalSub,
} from '../../model/formModalStyles';
import { VtMultiSelect } from "@shared/components/ui/VtMultiSelect";
import type { VtSelectOption } from "@shared/components/ui/VtSelect";
import {
  fetchContacts,
  resolvePlatformUserByPhone,
  type UserContact,
} from "@features/profile/api/contactsApi";
import { createSocialGroupChatThread } from "@features/chat/api/chatApi";
import { errorToUserMessage } from "@shared/services/http/apiErrorMessage";
import { useMarketStore } from "@features/market/model/store/useMarketStore";

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
}>;

function contactLabel(c: UserContact): string {
  const name = c.displayName?.trim();
  const phone = c.phoneDisplay?.trim() || c.phoneDigits?.trim();
  if (name && phone) return `${name} · ${phone}`;
  return name || phone || "Contacto";
}

export function ChatNewConversationModal({ open, onClose }: Props) {
  const nav = useNavigate();
  const onThreadCreated = useMarketStore((s) => s.onThreadCreatedFromServer);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [resolveBusy, setResolveBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createBusy, setCreateBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchContacts();
      setContacts(list);
    } catch (e) {
      toast.error(errorToUserMessage(e, "No se pudieron cargar los contactos."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) {
      setPhoneSearch("");
      setSelectedIds([]);
    }
  }, [open]);

  const multiselectOptions: VtSelectOption[] = useMemo(() => {
    const m = new Map(
      contacts.map((c) => [
        c.userId,
        { value: c.userId, label: contactLabel(c) } satisfies VtSelectOption,
      ]),
    );
    for (const id of selectedIds) {
      if (!m.has(id)) {
        m.set(id, { value: id, label: id });
      }
    }
    return [...m.values()];
  }, [contacts, selectedIds]);

  async function addResolvedFromSearch() {
    const raw = phoneSearch.trim();
    if (!raw) {
      toast.error("Ingresá un número para buscar.");
      return;
    }
    setResolveBusy(true);
    try {
      const u = await resolvePlatformUserByPhone(raw);
      setContacts((prev) => {
        const rest = prev.filter((x) => x.userId !== u.userId);
        const row: UserContact = {
          userId: u.userId,
          displayName: u.displayName,
          phoneDisplay: u.phoneDisplay,
          phoneDigits: u.phoneDigits,
        };
        return [row, ...rest];
      });
      setSelectedIds((prev) =>
        prev.includes(u.userId) ? prev : [...prev, u.userId],
      );
      setPhoneSearch("");
      toast.success(
        `${u.displayName?.trim() || "Usuario"} añadido a la selección`,
      );
    } catch (e) {
      toast.error(
        errorToUserMessage(
          e,
          "No encontramos un usuario con ese número en VibeTrade.",
        ),
      );
    } finally {
      setResolveBusy(false);
    }
  }

  async function createChat() {
    if (selectedIds.length === 0) {
      toast.error("Elegí al menos un contacto.");
      return;
    }
    setCreateBusy(true);
    try {
      const dto = await createSocialGroupChatThread(selectedIds);
      onThreadCreated(dto);
      toast.success(
        selectedIds.length > 1 ? "Grupo creado" : "Chat abierto",
      );
      onClose();
      nav(`/chat/${dto.id}`);
    } catch (e) {
      toast.error(
        errorToUserMessage(
          e,
          "No se pudo crear el chat. ¿Tenés una tienda en tu cuenta?",
        ),
      );
    } finally {
      setCreateBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-new-conv-title"
      onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
    >
      <div className={modalShellWide} onMouseDown={(e) => e.stopPropagation()}>
        <div className="vt-modal-title flex items-center gap-2" id="chat-new-conv-title">
          <Users size={22} className="shrink-0 text-[var(--primary)]" aria-hidden />
          Nuevo chat o grupo
        </div>
        <div className={modalSub}>
          Elegí uno o más contactos para abrir un chat directo o grupal. Podés
          buscar por número: si está registrado en VibeTrade, se añade a la
          selección. Este tipo de chat no incluye acuerdos comerciales ni rutas.
        </div>

        <div className={modalFormBody}>
          <label className="flex flex-col gap-2">
            <span className={fieldLabel}>Buscar por teléfono</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="vt-input min-h-[42px] flex-1"
                type="tel"
                autoComplete="tel"
                placeholder="+54 …"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                disabled={resolveBusy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addResolvedFromSearch();
                  }
                }}
              />
              <button
                type="button"
                className="vt-btn vt-btn-primary inline-flex shrink-0 items-center justify-center gap-2"
                disabled={resolveBusy}
                onClick={() => void addResolvedFromSearch()}
              >
                {resolveBusy ? (
                  <Loader2 className="animate-spin" size={16} aria-hidden />
                ) : null}
                Añadir si existe
              </button>
            </div>
          </label>

          <div className="mt-4">
            <span className={fieldLabel}>Participantes</span>
            <p className="mb-2 text-[12px] font-semibold text-[var(--muted)]">
              Contactos y números validados. Podés elegir varios para armar un
              grupo.
            </p>
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-[var(--muted)]">
                <Loader2 className="animate-spin" size={18} aria-hidden />
                Cargando contactos…
              </div>
            ) : (
              <VtMultiSelect
                ariaLabel="Participantes del chat"
                placeholder="Seleccionar contactos…"
                value={selectedIds}
                onChange={setSelectedIds}
                options={multiselectOptions}
              />
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
          <button type="button" className="vt-btn vt-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary inline-flex items-center gap-2"
            disabled={createBusy || loading || selectedIds.length === 0}
            onClick={() => void createChat()}
          >
            {createBusy ? (
              <Loader2 className="animate-spin" size={16} aria-hidden />
            ) : null}
            Abrir chat
          </button>
        </div>
      </div>
    </div>
  );
}
