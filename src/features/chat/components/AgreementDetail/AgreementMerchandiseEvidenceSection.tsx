import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { BadgeCheck, FileText, Loader2, Pencil, Upload, XCircle } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { uploadMedia, mediaApiUrl } from "@shared/services/media/mediaClient";
import { EvidenceAttachmentsList } from "../shared/EvidenceAttachmentsList";
import {
  decideMerchandiseEvidence,
  listAgreementMerchandisePayments,
  ROUTE_NOT_DELIVERED_FOR_MERCH_EVIDENCE_ES,
  upsertMerchandiseEvidence,
  type AgreementMerchandisePaymentApi,
  type MerchandiseEvidenceAttachmentApi,
} from "@features/chat/api/agreementMerchandiseEvidenceApi";
import {
  minorToMajor,
  currencyMinorDecimals,
} from "@features/payments/model/paymentFeePolicy";
import type { RouteSheet } from "@features/chat/model/routeSheetTypes";
import {
  agrDetailBlock,
  agrDetailH,
  agrDetailHint,
  fieldLabel,
} from '../../model/formModalStyles';

function fmtMoneyMinor(amountMinor: number, currencyLower?: string): string {
  const cur = (currencyLower ?? "usd").trim().toLowerCase() || "usd";
  const pow = currencyMinorDecimals(cur);
  const maj = minorToMajor(amountMinor, cur);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur.toUpperCase(),
      maximumFractionDigits: pow,
    }).format(maj);
  } catch {
    return `${maj.toFixed(pow)} ${cur.toUpperCase()}`;
  }
}

function sellerCanEditMerchEvidence(
  isActingSeller: boolean,
  pay: AgreementMerchandisePaymentApi,
): boolean {
  if (!isActingSeller) return false;
  if (pay.status === "released") return false;
  const evStatus = (pay.evidence?.status ?? "").trim().toLowerCase();
  return evStatus !== "accepted";
}

export function AgreementMerchandiseEvidenceSection(props: {
  threadId: string;
  agreementId: string;
  isActingSeller: boolean;
  routeSheetId?: string | null;
  routeSheetEstado?: RouteSheet["estado"];
  lastSystemMessageId?: string;
  lastSystemMessageText?: string;
}) {
  const {
    threadId,
    agreementId,
    isActingSeller,
    routeSheetId,
    routeSheetEstado,
    lastSystemMessageId,
    lastSystemMessageText,
  } = props;

  const [pays, setPays] = useState<AgreementMerchandisePaymentApi[]>([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<{
    pay: AgreementMerchandisePaymentApi;
    text: string;
    attachments: MerchandiseEvidenceAttachmentApi[];
    saving: boolean;
    uploading: boolean;
  } | null>(null);

  const lastRefreshRef = useRef<string | null>(null);

  const routeLinked = !!(routeSheetId ?? "").trim();
  const routeDelivered =
    !routeLinked ||
    (routeSheetEstado ?? "").trim().toLowerCase() === "entregada";

  async function reload() {
    setBusy(true);
    try {
      const list = await listAgreementMerchandisePayments(threadId, agreementId);
      setPays(list);
    } catch (e) {
      toast.error(
        (e as Error)?.message ?? "No se pudieron cargar pagos de mercancía.",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [threadId, agreementId]);

  useEffect(() => {
    if (!lastSystemMessageId) return;
    if (lastRefreshRef.current === lastSystemMessageId) return;
    const t = (lastSystemMessageText ?? "").toLowerCase();
    if (!t.includes("evidencia") && !t.includes("entregada") && !t.includes("compra completada"))
      return;
    lastRefreshRef.current = lastSystemMessageId;
    void reload();
  }, [lastSystemMessageId, lastSystemMessageText]);

  if (pays.length === 0 && !busy) return null;

  const modalSellerCanEdit =
    modal !== null && sellerCanEditMerchEvidence(isActingSeller, modal.pay);

  return (
    <>
      <div className={agrDetailBlock}>
        <div className={agrDetailH}>Pagos y evidencia (mercancía)</div>
        {routeLinked && !routeDelivered ? (
          <p className={cn("vt-muted", agrDetailHint, "mb-2")}>
            Presentá la evidencia cuando la hoja de ruta esté{" "}
            <strong className="text-[var(--text)]">entregada</strong>.
          </p>
        ) : null}
        {busy ? (
          <div className="vt-muted flex items-center gap-2 text-[13px]">
            <Loader2 className="animate-spin" size={16} aria-hidden />
            Cargando…
          </div>
        ) : (
          <div className="space-y-2">
            {pays.map((p) => {
              const ev = p.evidence;
              const evStatus = (ev?.status ?? "").trim().toLowerCase();
              const released = p.status === "released";
              const canEditSeller = sellerCanEditMerchEvidence(isActingSeller, p);
              const canDecideBuyer = !isActingSeller && evStatus === "submitted";
              const submitBlocked = routeLinked && !routeDelivered;
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--surface)_96%,transparent)] p-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[13px] font-bold text-[var(--text)]">
                      {released ? "Pago liberado" : "Pago retenido"}
                    </div>
                    <div className="font-mono text-[13px] font-bold">
                      {fmtMoneyMinor(p.amountMinor, p.currencyLower)}
                    </div>
                  </div>
                  <div className="vt-muted mt-1 text-[12px]">
                    Evidencia:{" "}
                    <b className="text-[var(--text)]">{evStatus || "—"}</b>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ev || canEditSeller ? (
                      <button
                        type="button"
                        className="vt-btn vt-btn-sm inline-flex items-center gap-1.5"
                        disabled={canEditSeller && submitBlocked}
                        title={
                          submitBlocked
                            ? ROUTE_NOT_DELIVERED_FOR_MERCH_EVIDENCE_ES
                            : undefined
                        }
                        onClick={() =>
                          setModal({
                            pay: p,
                            text: ev?.text ?? "",
                            attachments: ev?.attachments ?? [],
                            saving: false,
                            uploading: false,
                          })
                        }
                      >
                        {canEditSeller ? (
                          <>
                            <Pencil size={14} aria-hidden />
                            {ev ? "Editar evidencia" : "Añadir evidencia"}
                          </>
                        ) : (
                          <>
                            <FileText size={14} aria-hidden />
                            Ver evidencia
                          </>
                        )}
                      </button>
                    ) : null}
                    {canDecideBuyer ? (
                      <>
                        <button
                          type="button"
                          className="vt-btn vt-btn-sm inline-flex items-center gap-1.5"
                          onClick={() =>
                            void (async () => {
                              try {
                                await decideMerchandiseEvidence({
                                  threadId,
                                  agreementId,
                                  paymentId: p.id,
                                  decision: "accept",
                                });
                                toast.success("Evidencia aceptada.");
                                await reload();
                              } catch (e) {
                                toast.error(
                                  (e as Error)?.message ??
                                    "No se pudo aceptar.",
                                );
                              }
                            })()
                          }
                        >
                          <BadgeCheck size={14} aria-hidden />
                          Aceptar
                        </button>
                        <button
                          type="button"
                          className="vt-btn vt-btn-sm inline-flex items-center gap-1.5"
                          onClick={() =>
                            void (async () => {
                              try {
                                await decideMerchandiseEvidence({
                                  threadId,
                                  agreementId,
                                  paymentId: p.id,
                                  decision: "reject",
                                });
                                toast.success("Evidencia rechazada.");
                                await reload();
                              } catch (e) {
                                toast.error(
                                  (e as Error)?.message ??
                                    "No se pudo rechazar.",
                                );
                              }
                            })()
                          }
                        >
                          <XCircle size={14} aria-hidden />
                          Rechazar
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--text)]">
              Evidencia de mercancía
            </h3>
            <label className="mt-3 block">
              <span className={fieldLabel}>Descripción</span>
              <textarea
                className="vt-input mt-1 min-h-[100px] w-full"
                value={modal.text}
                disabled={modal.saving || !modalSellerCanEdit}
                onChange={(e) =>
                  setModal((m) => (m ? { ...m, text: e.target.value } : m))
                }
              />
            </label>
            <div className="mt-3">
              <span className={fieldLabel}>Adjuntos</span>
              <EvidenceAttachmentsList
                atts={modal.attachments}
                onRemove={
                  modalSellerCanEdit
                    ? (id) =>
                        setModal((m) =>
                          m
                            ? {
                                ...m,
                                attachments: m.attachments.filter(
                                  (a) => a.id !== id,
                                ),
                              }
                            : m,
                        )
                    : undefined
                }
                emptyLabel={
                  modal.attachments.length === 0
                    ? "Sin archivos adjuntos."
                    : undefined
                }
              />
            </div>
            {modalSellerCanEdit ? (
              <div className="mt-3">
                <input
                  type="file"
                  className="hidden"
                  id="merch-evidence-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void (async () => {
                      setModal((m) => (m ? { ...m, uploading: true } : m));
                      try {
                        const r = await uploadMedia(file);
                        const att: MerchandiseEvidenceAttachmentApi = {
                          id: r.id,
                          url: mediaApiUrl(r.id),
                          fileName: file.name,
                          kind: file.type.startsWith("image/") ? "image" : "file",
                        };
                        setModal((m) =>
                          m
                            ? {
                                ...m,
                                attachments: [...m.attachments, att],
                                uploading: false,
                              }
                            : m,
                        );
                      } catch (err) {
                        toast.error(
                          (err as Error)?.message ?? "Error al subir archivo.",
                        );
                        setModal((m) => (m ? { ...m, uploading: false } : m));
                      }
                    })();
                    e.target.value = "";
                  }}
                />
                <label
                  htmlFor="merch-evidence-file"
                  className="vt-btn vt-btn-sm inline-flex cursor-pointer items-center gap-1.5"
                >
                  {modal.uploading ? (
                    <Loader2 className="animate-spin" size={14} aria-hidden />
                  ) : (
                    <Upload size={14} aria-hidden />
                  )}
                  Adjuntar
                </label>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="vt-btn"
                onClick={() => setModal(null)}
              >
                Cerrar
              </button>
              {modalSellerCanEdit ? (
                <>
                  <button
                    type="button"
                    className="vt-btn"
                    disabled={modal.saving}
                    onClick={() =>
                      void (async () => {
                        setModal((m) => (m ? { ...m, saving: true } : m));
                        try {
                          await upsertMerchandiseEvidence({
                            threadId,
                            agreementId,
                            paymentId: modal.pay.id,
                            text: modal.text,
                            attachments: modal.attachments,
                            submit: false,
                          });
                          toast.success("Borrador guardado.");
                          await reload();
                          setModal(null);
                        } catch (e) {
                          toast.error(
                            (e as Error)?.message ?? "No se pudo guardar.",
                          );
                        } finally {
                          setModal((m) => (m ? { ...m, saving: false } : m));
                        }
                      })()
                    }
                  >
                    Guardar borrador
                  </button>
                  <button
                    type="button"
                    className="vt-btn vt-btn-primary"
                    disabled={
                      modal.saving ||
                      modal.uploading ||
                      (routeLinked && !routeDelivered)
                    }
                    title={
                      routeLinked && !routeDelivered
                        ? ROUTE_NOT_DELIVERED_FOR_MERCH_EVIDENCE_ES
                        : undefined
                    }
                    onClick={() =>
                      void (async () => {
                        setModal((m) => (m ? { ...m, saving: true } : m));
                        try {
                          await upsertMerchandiseEvidence({
                            threadId,
                            agreementId,
                            paymentId: modal.pay.id,
                            text: modal.text,
                            attachments: modal.attachments,
                            submit: true,
                          });
                          toast.success("Evidencia enviada.");
                          await reload();
                          setModal(null);
                        } catch (e) {
                          toast.error(
                            (e as Error)?.message ?? "No se pudo enviar.",
                          );
                        } finally {
                          setModal((m) => (m ? { ...m, saving: false } : m));
                        }
                      })()
                    }
                  >
                    Enviar evidencia
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
