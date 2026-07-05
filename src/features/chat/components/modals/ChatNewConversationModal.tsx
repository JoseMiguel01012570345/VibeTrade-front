import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { CeSpinner, CeTransitionModalShell } from "@shared/components/ui";
import { fieldLabel, modalFormBody } from "@shared/styles/modals/formModalStyles";
import { VtMultiSelect } from "@shared/components/ui/VtMultiSelect";
import type { VtSelectOption } from "@shared/components/ui/VtSelect";
import {
  useContacts,
  useResolveUserByPhoneMutation,
} from "@features/profile/hooks/useContacts";
import type { UserContact } from "@features/profile/api/contactsApi";
import { createSocialGroupChatThread } from "@features/chat/api/chatApi";
import { toast } from "sonner";
import { toastApiError } from "@features/auth/logic/toastApiError";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { cn } from "@shared/lib/cn";

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
}>;

const CHAT_MODAL_PANEL =
  "flex max-h-[min(90vh,900px)] w-[min(920px,100%)] max-w-none flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] text-[var(--text)]";

function contactLabel(c: UserContact): string {
  const name = c.displayName?.trim();
  const phone = c.phoneDisplay?.trim() || c.phoneDigits?.trim();
  if (name && phone) return `${name} · ${phone}`;
  return name || phone || "Contacto";
}

export function ChatNewConversationModal({ open, onClose }: Props) {
  const nav = useNavigate();
  const onThreadCreated = useMarketStore((s) => s.onThreadCreatedFromServer);
  const contactsQuery = useContacts({ enabled: open });
  const resolveMutation = useResolveUserByPhoneMutation();
  const [phoneSearch, setPhoneSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resolvedExtras, setResolvedExtras] = useState<UserContact[]>([]);
  const [createBusy, setCreateBusy] = useState(false);

  const contacts = contactsQuery.data ?? [];
  const loading = contactsQuery.isLoading;

  useEffect(() => {
    if (!open) {
      setPhoneSearch("");
      setSelectedIds([]);
      setResolvedExtras([]);
    }
  }, [open]);

  const multiselectOptions: VtSelectOption[] = useMemo(() => {
    const m = new Map(
      [...contacts, ...resolvedExtras].map((c) => [
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
  }, [contacts, resolvedExtras, selectedIds]);

  async function addResolvedFromSearch() {
    const raw = phoneSearch.trim();
    if (!raw) {
      toast.error("Ingresá un número para buscar.");
      return;
    }
    try {
      const u = await resolveMutation.mutateAsync(raw);
      const row: UserContact = {
        userId: u.userId,
        displayName: u.displayName,
        phoneDisplay: u.phoneDisplay,
        phoneDigits: u.phoneDigits,
      };
      setResolvedExtras((prev) => {
        const rest = prev.filter((x) => x.userId !== u.userId);
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
      toastApiError(e, "No encontramos un usuario con ese número en VibeTrade.");
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
      toastApiError(e, "No se pudo crear el chat. ¿Tenés una tienda en tu cuenta?");
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <CeTransitionModalShell
      show={open}
      onClose={() => !createBusy && onClose()}
      size="7xl"
      theme={{
        content: {
          inner: `${CHAT_MODAL_PANEL} vt-chat-new-conversation-modal`,
        },
      }}
      backdropClassName="bg-[rgba(2,6,23,0.55)]"
    >
      <div
        id="chat-new-conversation-title"
        className="vt-modal-title inline-flex items-center gap-2 text-[var(--text)]"
      >
        <Users
          size={22}
          className="vt-chat-new-conversation-modal__icon shrink-0"
          aria-hidden
        />
        Nuevo chat o grupo
      </div>

      <div className={cn(modalFormBody, "gap-4")}>
        <p className="mb-0 text-[13px] leading-snug text-[var(--muted)]">
          Elegí uno o más contactos para abrir un chat directo o grupal. Podés
          buscar por número: si está registrado en VibeTrade, se añade a la
          selección. Este tipo de chat no incluye acuerdos comerciales ni rutas.
        </p>

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
              disabled={resolveMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addResolvedFromSearch();
                }
              }}
            />
            <button
              type="button"
              className={cn(
                "vt-btn vt-btn-primary inline-flex shrink-0 items-center justify-center gap-2",
                resolveMutation.isPending && "pointer-events-none opacity-70",
              )}
              disabled={resolveMutation.isPending}
              onClick={() => void addResolvedFromSearch()}
            >
              {resolveMutation.isPending ? (
                <CeSpinner size="sm" aria-label="Buscando" />
              ) : null}
              Añadir si existe
            </button>
          </div>
        </label>

        <div>
          <span className={fieldLabel}>Participantes</span>
          <p className="mb-2 text-xs font-semibold text-[var(--muted)]">
            Contactos y números validados. Podés elegir varios para armar un
            grupo.
          </p>
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-[var(--muted)]">
              <CeSpinner
                size="md"
                className="vt-chat-new-conversation-modal__spinner"
                aria-label="Cargando contactos"
              />
              Cargando contactos…
            </div>
          ) : multiselectOptions.length === 0 ? (
            <p className="vt-chat-new-conversation-modal__empty rounded-xl border border-dashed px-3 py-4 text-[13px] leading-snug text-[var(--muted)]">
              No hay contactos en tu lista. Buscá un número arriba para añadir
              participantes.
            </p>
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

      <div className="vt-modal-actions mt-2 shrink-0 border-t border-[var(--border)] pt-4">
        <button
          type="button"
          className="vt-btn"
          disabled={createBusy}
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={cn(
            "vt-btn vt-btn-primary inline-flex items-center justify-center gap-2",
            (createBusy || loading || selectedIds.length === 0) &&
              "pointer-events-none opacity-60",
          )}
          disabled={createBusy || loading || selectedIds.length === 0}
          onClick={() => void createChat()}
        >
          {createBusy ? <CeSpinner size="sm" aria-label="Abriendo chat" /> : null}
          Abrir chat
        </button>
      </div>
    </CeTransitionModalShell>
  );
}
