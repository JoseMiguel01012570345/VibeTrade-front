import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { CeButton, CeModal, CeSpinner } from "@shared/components/ui";
import { fieldLabel } from "@shared/styles/modals/formModalStyles";
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
    <CeModal
      show={open}
      onClose={() => !createBusy && onClose()}
      title={
        <span className="inline-flex items-center gap-2">
          <Users size={22} className="shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
          Nuevo chat o grupo
        </span>
      }
      size="3xl"
      bodyClassName="pt-2"
      footer={
        <>
          <CeButton color="gray" outline disabled={createBusy} onClick={onClose}>
            Cancelar
          </CeButton>
          <CeButton
            loading={createBusy}
            disabled={loading || selectedIds.length === 0}
            onClick={() => void createChat()}
          >
            Abrir chat
          </CeButton>
        </>
      }
    >
      <p className="mb-4 text-sm leading-snug text-gray-600 dark:text-gray-400">
        Elegí uno o más contactos para abrir un chat directo o grupal. Podés
        buscar por número: si está registrado en VibeTrade, se añade a la
        selección. Este tipo de chat no incluye acuerdos comerciales ni rutas.
      </p>

      <label className="flex flex-col gap-2">
        <span className={fieldLabel}>Buscar por teléfono</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="min-h-[42px] flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
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
          <CeButton
            className="shrink-0"
            loading={resolveMutation.isPending}
            onClick={() => void addResolvedFromSearch()}
          >
            Añadir si existe
          </CeButton>
        </div>
      </label>

      <div className="mt-4">
        <span className={fieldLabel}>Participantes</span>
        <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
          Contactos y números validados. Podés elegir varios para armar un grupo.
        </p>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-gray-500 dark:text-gray-400">
            <CeSpinner size="md" aria-label="Cargando contactos" />
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
    </CeModal>
  );
}
