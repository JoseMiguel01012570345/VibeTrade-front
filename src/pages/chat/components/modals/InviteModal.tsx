import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ExternalLink } from "lucide-react";
import { cn } from "../../../../lib/cn";
import type { RouteSheet } from "../../domain/routeSheetTypes";
import type { ThreadChatCarrier } from "../../../../app/store/marketStoreTypes";
import { postRouteSheetNotifyPreselected } from "../../../../utils/chat/chatApi";
import { mapBackdropLayerAboveChatRail } from "../../styles/formModalStyles";

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

export function InviteModal({
  routeSheet,
  chatCarriers,
  onClose,
  onAccepted,
}: Props) {
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [selectedStopIds, setSelectedStopIds] = useState<Set<string>>(() => new Set());
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
      const nameLabel =
        named && named !== "—" ? named : "—";

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

  const allSelected =
    rows.length > 0 && rows.every((r) => selectedStopIds.has(r.stopId));

  useLayoutEffect(() => {
    const el = selectAllRef.current;
    if (!el || rows.length === 0) return;
    const n = rows.filter((r) => selectedStopIds.has(r.stopId)).length;
    el.indeterminate = n > 0 && n < rows.length;
  }, [rows, selectedStopIds]);

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

  return createPortal(
    <div
      className={cn(mapBackdropLayerAboveChatRail)}
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          "vt-modal flex max-h-[min(88vh,780px)] w-full max-w-[720px] flex-col overflow-hidden p-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id="invite-modal-title" className="vt-modal-title mb-0">
              Invitar transportistas
            </h2>
            <p className="vt-muted m-0 max-w-md text-[12px] leading-snug">
              Se notificará por la plataforma a cada contacto seleccionado con
              teléfono registrado.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {rows.length === 0 ? (
            <p className="vt-muted m-0 text-[13px] leading-snug">
              No hay tramos con un teléfono de transportista válido en esta hoja.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] text-[var(--muted)] [&_th]:font-extrabold">
                  <tr className="border-b border-[var(--border)]">
                    <th className="w-10 px-2 py-2" scope="col">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allSelected}
                        aria-label="Seleccionar todos"
                        disabled={inviting}
                        className="h-4 w-4 accent-[var(--primary)]"
                        onChange={(e) => {
                          const on = e.target.checked;
                          setSelectedStopIds(
                            on
                              ? new Set(rows.map((r) => r.stopId))
                              : new Set(),
                          );
                        }}
                      />
                    </th>
                    <th className="px-2 py-2" scope="col">
                      Teléfono
                    </th>
                    <th className="px-2 py-2" scope="col">
                      Nombre
                    </th>
                    <th className="min-w-[140px] px-2 py-2" scope="col">
                      Servicio de transporte
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text)]">
                  {rows.map((r) => (
                    <tr
                      key={r.stopId}
                      className="border-b border-[var(--border)] last:border-b-0"
                    >
                      <td className="px-2 py-2 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedStopIds.has(r.stopId)}
                          disabled={inviting}
                          aria-label={`Seleccionar ${r.phone}`}
                          className="h-4 w-4 accent-[var(--primary)]"
                          onChange={(e) => {
                            setSelectedStopIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(r.stopId);
                              else next.delete(r.stopId);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="max-w-[180px] break-words px-2 py-2 align-middle font-mono text-[12px]">
                        {r.phone}
                      </td>
                      <td className="px-2 py-2 align-middle">{r.nameLabel}</td>
                      <td className="px-2 py-2 align-middle">
                        {r.serviceOfferId ? (
                          <Link
                            to={`/offer/${encodeURIComponent(r.serviceOfferId)}`}
                            className="inline-flex items-center gap-1 font-bold text-[var(--primary)] no-underline hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver servicio
                            <ExternalLink
                              size={12}
                              className="shrink-0 opacity-80"
                              aria-hidden
                            />
                          </Link>
                        ) : (
                          <span className="vt-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="vt-modal-actions border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            className="vt-btn"
            disabled={inviting}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            disabled={inviting || rows.length === 0}
            onClick={() => void handleInvite()}
          >
            {inviting ? "Enviando…" : "Invitar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
