import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ExternalLink } from "lucide-react";
import { Button, Spinner } from "flowbite-react";
import type { RouteSheet } from "../../domain/routeSheetTypes";
import type { ThreadChatCarrier } from "../../../../app/store/marketStoreTypes";
import { postRouteSheetNotifyPreselected } from "../../../../utils/chat/chatApi";
import { FlowbiteChatModal } from "../Components/layout/FlowbiteChatModal";
import {
  type SelectableColumnDef,
  SelectableDataTable,
} from "../Components/data/SelectableDataTable";

type Props = {
  routeSheet: RouteSheet;
  /** Integrantes conocidos por teléfono (nombre en tabla). */
  chatCarriers?: ThreadChatCarrier[];
  onClose: () => void;
  onAccepted: () => void;
};

function normTelKey(phone: string): string {
  return phone.replace(/[\s.]/g, "").replace(/-/g, "");
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

type InviteRow = {
  stopId: string;
  phone: string;
  nameLabel: string;
  serviceOfferId?: string;
};

const inviteColumns: SelectableColumnDef<InviteRow>[] = [
  {
    id: "phone",
    header: "Teléfono",
    className: "max-w-[11rem]",
    cell: (r) => (
      <span className="font-mono text-xs text-gray-800 dark:text-gray-100">
        {r.phone}
      </span>
    ),
  },
  {
    id: "name",
    header: "Nombre",
    cell: (r) => r.nameLabel,
  },
  {
    id: "service",
    header: "Servicio de transporte",
    className: "min-w-[9rem]",
    cell: (r) =>
      r.serviceOfferId ? (
        <Link
          to={`/offer/${encodeURIComponent(r.serviceOfferId)}`}
          className="inline-flex items-center gap-1 font-semibold text-primary-700 no-underline hover:underline dark:text-primary-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver servicio
          <ExternalLink size={14} aria-hidden />
        </Link>
      ) : (
        <span className="text-gray-400 dark:text-gray-500">—</span>
      ),
  },
];

export function InviteModal({
  routeSheet,
  chatCarriers,
  onClose,
  onAccepted,
}: Props) {
  const [selectedStopIds, setSelectedStopIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [inviting, setInviting] = useState(false);

  const rows: InviteRow[] = useMemo(() => {
    const out: InviteRow[] = [];
    const byTel = new Map<string, string>();
    for (const c of chatCarriers ?? []) {
      const p = (c.phone ?? "").trim();
      if (!p) continue;
      const k = normTelKey(p);
      if (!byTel.has(k)) byTel.set(k, (c.name ?? "").trim() || "—");
    }

    for (const p of routeSheet.paradas ?? []) {
      const phone = (p.telefonoTransportista ?? "").trim();
      if (digitsOnly(phone).length < 6) continue;
      const k = normTelKey(phone);
      const named = byTel.get(k)?.trim();
      const nameLabel = named && named !== "—" ? named : "—";

      const sid = (p.transportInvitedStoreServiceId ?? "").trim();

      out.push({
        stopId: p.id,
        phone,
        nameLabel,
        serviceOfferId: sid || undefined,
      });
    }
    out.sort((a, b) => a.phone.localeCompare(b.phone, "es"));
    return out;
  }, [routeSheet.paradas, chatCarriers]);

  useEffect(() => {
    setSelectedStopIds(new Set(rows.map((r) => r.stopId)));
  }, [routeSheet.id, rows]);

  const selectedCount = useMemo(
    () => rows.filter((r) => selectedStopIds.has(r.stopId)).length,
    [rows, selectedStopIds],
  );

  const selectAllChecked =
    rows.length > 0 && selectedCount === rows.length;
  const selectAllIndeterminate =
    selectedCount > 0 && selectedCount < rows.length;

  async function handleInvite() {
    const invites = rows
      .filter((r) => selectedStopIds.has(r.stopId))
      .map((r) => ({ stopId: r.stopId, phone: r.phone }));

    if (invites.length === 0) {
      toast.error("Seleccioná al menos un transportista.");
      return;
    }

    const tid = (routeSheet.threadId ?? "").trim();
    const rid = (routeSheet.id ?? "").trim();
    if (tid.length < 4 || !rid) {
      toast.error("No se pudo invitar (datos de hilo incompletos).");
      return;
    }

    setInviting(true);
    try {
      const { notifiedCount } = await postRouteSheetNotifyPreselected(
        tid,
        rid,
        invites,
      );
      if (notifiedCount > 0) {
        toast.success(
          notifiedCount === 1
            ? "Se envió 1 invitación."
            : `Se enviaron ${notifiedCount} invitaciones.`,
        );
        onAccepted();
      } else {
        toast.error(
          "No se pudo enviar ninguna invitación. Verificá que los números estén dados de alta.",
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al invitar.";
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  }

  return (
    <FlowbiteChatModal
      show
      onDismiss={onClose}
      title="Invitar transportistas"
      description="Se notificará por la plataforma a cada contacto seleccionado con teléfono registrado."
      bodyClassName="pt-6"
      footer={
        <>
          <Button color="light" disabled={inviting} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="inline-flex items-center gap-2"
            color="blue"
            disabled={inviting || rows.length === 0}
            onClick={() => void handleInvite()}
          >
            {inviting ? (
              <>
                <Spinner aria-hidden light size="sm" />
                Enviando…
              </>
            ) : (
              "Invitar"
            )}
          </Button>
        </>
      }
    >
      <SelectableDataTable<InviteRow>
        rows={rows}
        columns={inviteColumns}
        getRowKey={(r) => r.stopId}
        selectedKeys={selectedStopIds}
        disabled={inviting}
        selectAllChecked={selectAllChecked}
        selectAllIndeterminate={selectAllIndeterminate}
        selectColumnHeaderLabel="Seleccionar todos los transportistas"
        emptyMessage="No hay tramos con un teléfono de transportista válido en esta hoja."
        onToggleRow={(stopId, checked) =>
          setSelectedStopIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(stopId);
            else next.delete(stopId);
            return next;
          })
        }
        onToggleAll={(checked) =>
          setSelectedStopIds(checked ? new Set(rows.map((r) => r.stopId)) : new Set())
        }
      />
    </FlowbiteChatModal>
  );
}
