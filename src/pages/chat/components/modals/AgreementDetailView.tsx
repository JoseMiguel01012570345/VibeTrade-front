import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  Download,
  FileText,
  Loader2,
  Pencil,
  Upload,
  XCircle,
} from "lucide-react";
import { VtSelect, type VtSelectOption } from "../../../../components/VtSelect";
import { ProtectedMediaImg } from "../../../../components/media/ProtectedMediaImg";
import { useMarketStore } from "../../../../app/store/useMarketStore";
import { cn } from "../../../../lib/cn";
import {
  agreementDeclaresMerchandise,
  agreementDeclaresService,
  legacyCombinedExtraFields,
  merchandiseScopedExtraFields,
  normalizeAgreementServices,
  normalizeMerchandiseLine,
  serviceScopedExtraFields,
  type MerchandiseLine,
  type MerchandiseSectionMeta,
  type TradeAgreement,
  type TradeAgreementExtraFieldDraft,
} from "../../domain/tradeAgreementTypes";
import type {
  StoreCatalog,
  StoreProduct,
} from "../../domain/storeCatalogTypes";
import {
  findStoreProduct,
  findStoreService,
} from "../../domain/storeCatalogTypes";
import { ServiceItemPreview } from "./serviceConfig/ServiceItemPreview";
import type { RouteSheet } from "../../domain/routeSheetTypes";
import { agreementHasMerchandiseForRouteLink } from "../../domain/tradeAgreementValidation";
import { downloadTradeAgreementPdf } from "../../utils/tradeAgreementPdfDownload";
import {
  decideServiceEvidence,
  listAgreementServicePayments,
  upsertServiceEvidence,
  type AgreementServicePaymentApi,
  type ServiceEvidenceAttachmentApi,
} from "../../../../utils/chat/agreementServiceEvidenceApi";
import { uploadMedia, mediaApiUrl } from "../../../../utils/media/mediaClient";
import { minorToMajor, stripeMinorDecimals } from "../../domain/paymentFeePolicy";
import {
  agrDetailBlock,
  agrDetailCard,
  agrDetailH,
  agrDetailHint,
  agrDetailLabel,
  agrDetailLink,
  agrDetailRoot,
  agrDetailRow,
  agrDetailSub,
  agrDetailValue,
  fieldLabel,
  linkRutaRow,
  linkRutaSelect,
} from "../../styles/formModalStyles";

function Row({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className={agrDetailRow}>
      <div className={agrDetailLabel}>{label}</div>
      <div className={agrDetailValue}>{value}</div>
    </div>
  );
}

function fmtMoneyMinor(amountMinor: number, currencyLower: string): string {
  const cur = currencyLower.trim().toLowerCase();
  const pow = stripeMinorDecimals(cur);
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

function EvidenceAttachmentsList({
  atts,
  onRemove,
}: {
  atts: ServiceEvidenceAttachmentApi[];
  onRemove?: (id: string) => void;
}) {
  if (atts.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {atts.map((a) => (
        <div
          key={a.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] px-2.5 py-2 text-[13px]"
        >
          <a
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 break-words font-semibold text-[var(--primary)] underline"
          >
            {a.fileName || "Abrir adjunto"}
          </a>
          {onRemove ? (
            <button
              type="button"
              className="vt-btn vt-btn-ghost inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-[12px]"
              onClick={() => onRemove(a.id)}
            >
              <XCircle size={14} aria-hidden />
              Quitar
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function normalizeEvidenceForCompare(
  text: string,
  atts: ServiceEvidenceAttachmentApi[],
): { text: string; attsKey: string } {
  const t = (text ?? "").trim();
  const key = (atts ?? [])
    .map((a) => ({
      url: (a.url ?? "").trim(),
      fileName: (a.fileName ?? "").trim(),
      kind: (a.kind ?? "").trim(),
    }))
    .sort((a, b) =>
      `${a.url}|${a.fileName}|${a.kind}`.localeCompare(
        `${b.url}|${b.fileName}|${b.kind}`,
        "es",
      ),
    )
    .map((a) => `${a.url}|${a.fileName}|${a.kind}`)
    .join(";;");
  return { text: t, attsKey: key };
}

function ExtraFieldClauseCards({
  fields,
}: {
  fields: TradeAgreementExtraFieldDraft[];
}) {
  if (!fields.length) return null;
  return (
    <>
      {fields.map((f) => (
        <div
          key={f.id}
          className="mb-4 rounded-xl border border-[color-mix(in_oklab,var(--border)_72%,transparent)] p-3 last:mb-0"
        >
          <div className="mb-2 font-extrabold text-[var(--text)]">
            {f.title.trim() || "(sin título)"}
          </div>
          {f.valueKind === "text" && (f.textValue ?? "").trim() ? (
            <div className="whitespace-pre-wrap text-sm text-[var(--text)]">
              {(f.textValue ?? "").trim()}
            </div>
          ) : null}
          {f.valueKind === "image" && (f.mediaUrl ?? "").trim() ? (
            <div className="mt-2 max-w-lg">
              <ProtectedMediaImg
                src={(f.mediaUrl ?? "").trim()}
                alt=""
                className="max-h-72 w-full rounded border border-[var(--border)] object-contain"
              />
            </div>
          ) : null}
          {f.valueKind === "document" && (f.mediaUrl ?? "").trim() ? (
            <a
              href={(f.mediaUrl ?? "").trim()}
              target="_blank"
              rel="noreferrer"
              className={agrDetailLink}
            >
              {f.fileName?.trim() || "Abrir documento adjunto"}
            </a>
          ) : null}
        </div>
      ))}
    </>
  );
}

function legacyMerchandiseMetaHasContent(m?: MerchandiseSectionMeta): boolean {
  if (!m) return false;
  return Object.values(m).some((v) => (v ?? "").trim() !== "");
}

function FichaProductoExcerpt({ p }: { p: StoreProduct }) {
  return (
    <div className="mb-2 space-y-2 rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] p-2.5 text-[13px]">
      <div className="font-extrabold text-[var(--text)]">Ficha de producto</div>
      {p.model?.trim() ? (
        <Row label="Versión / modelo" value={p.model} />
      ) : null}
      {p.shortDescription?.trim() ? (
        <p className="whitespace-pre-wrap text-[var(--text)]">
          {p.shortDescription}
        </p>
      ) : null}
      {p.mainBenefit?.trim() ? (
        <Row label="Beneficio principal" value={p.mainBenefit} />
      ) : null}
      {p.technicalSpecs?.trim() ? (
        <div>
          <div className="mb-0.5 text-[10px] font-extrabold uppercase text-[var(--muted)]">
            Características técnicas
          </div>
          <div className="whitespace-pre-wrap text-[var(--text)]">
            {p.technicalSpecs}
          </div>
        </div>
      ) : null}
      {p.contentIncluded?.trim() ? (
        <Row label="Contenido incluido" value={p.contentIncluded} />
      ) : null}
      {p.usageConditions?.trim() ? (
        <Row label="Condiciones de uso" value={p.usageConditions} />
      ) : null}
      {p.taxesShippingInstall?.trim() ? (
        <Row label="Envío / impuestos (ficha)" value={p.taxesShippingInstall} />
      ) : null}
      {p.customFields.length > 0 ? (
        <div>
          <div className="mb-1.5 text-[10px] font-extrabold uppercase text-[var(--muted)]">
            Campos y adjuntos
          </div>
          {p.customFields.map((f, j) => (
            <div
              key={j}
              className="mb-2 rounded border border-[color-mix(in_oklab,var(--border)_70%,transparent)] p-2 last:mb-0"
            >
              {f.title?.trim() ? (
                <div className="font-bold text-[var(--text)]">{f.title}</div>
              ) : null}
              {f.attachmentNote?.trim() ? (
                <div className="text-[11px] text-[var(--muted)]">
                  {f.attachmentNote}
                </div>
              ) : null}
              {f.body?.trim() ? (
                <div className="whitespace-pre-wrap text-sm text-[var(--text)]">
                  {f.body}
                </div>
              ) : null}
              {f.attachments?.length ? (
                <ul className="mt-1.5 list-inside list-disc text-xs">
                  {f.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(agrDetailLink, "inline")}
                      >
                        {a.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {p.photoUrls?.filter((u) => u?.trim()).length ? (
        <div>
          <div className="mb-1.5 text-[10px] font-extrabold uppercase text-[var(--muted)]">
            Fotos
          </div>
          <div className="flex flex-wrap gap-1.5">
            {p.photoUrls
              .filter((u) => u?.trim())
              .slice(0, 12)
              .map((url, u) => (
                <a
                  key={u}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-20 w-20 overflow-hidden rounded border border-[var(--border)]"
                >
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </a>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MerchandiseBlock({
  lines,
  catalog,
}: {
  lines: MerchandiseLine[];
  catalog?: StoreCatalog;
}) {
  if (!lines.length) return null;
  return (
    <div className={agrDetailBlock}>
      <div className={agrDetailH}>Mercancías</div>
      {lines.map((raw, i) => {
        const line = normalizeMerchandiseLine(raw);
        const linked = findStoreProduct(catalog, line.linkedStoreProductId);
        return (
          <div key={i} className={agrDetailCard}>
            <div className={agrDetailSub}>Ítem {i + 1}</div>
            {linked ? <FichaProductoExcerpt p={linked} /> : null}
            {linked ? (
              <Row
                label="Producto (catálogo)"
                value={`${linked.name} · ${linked.category}`}
              />
            ) : null}
            <Row label="Tipo" value={line.tipo} />
            <Row label="Cantidad" value={line.cantidad} />
            <Row label="Valor unitario" value={line.valorUnitario} />
            <Row label="Estado" value={line.estado} />
            <Row label="Descuento" value={line.descuento} />
            <Row label="Impuestos" value={line.impuestos} />
            <Row label="Moneda" value={line.moneda} />
            <Row
              label="Condiciones para devolver y garantias (ficha)"
              value={line.devolucionesDesc}
            />
            <div className="my-1 border-t border-[color-mix(in_oklab,var(--border)_70%,transparent)] pt-1 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
              Comprador
            </div>
            <Row label="Tipo de embalaje" value={line.tipoEmbalaje} />
            <Row
              label="Quién paga envío de devolución"
              value={line.devolucionQuienPaga}
            />
            <Row label="Plazos (devolución)" value={line.devolucionPlazos} />
            <Row
              label="Regulaciones, aduanas, restricciones, permisos"
              value={line.regulaciones}
            />
          </div>
        );
      })}
    </div>
  );
}

export function AgreementDetailView({
  a,
  threadId,
  isActingSeller = false,
  onOpenRouteSheet,
  routeSheets = [],
  onLinkRouteSheet,
  onUnlinkRouteSheet,
  linkActionsDisabled = false,
}: {
  a: TradeAgreement;
  threadId: string;
  isActingSeller?: boolean;
  onOpenRouteSheet?: (routeSheetId: string) => void;
  routeSheets?: RouteSheet[];
  onLinkRouteSheet?: (agreementId: string, routeSheetId: string) => void;
  onUnlinkRouteSheet?: (agreementId: string) => void;
  linkActionsDisabled?: boolean;
}) {
  const m = a.merchandiseMeta ?? undefined;
  const catalog = useMarketStore((s) => s.storeCatalogs[a.issuedByStoreId]);
  const services = normalizeAgreementServices(a);
  const showMerch = agreementDeclaresMerchandise(a);
  const showService = agreementDeclaresService(a);
  const [pickId, setPickId] = useState(a.routeSheetId ?? "");
  useEffect(() => {
    setPickId(a.routeSheetId ?? "");
  }, [a.id, a.routeSheetId]);

  const [servicePays, setServicePays] = useState<AgreementServicePaymentApi[]>([]);
  const [servicePaysBusy, setServicePaysBusy] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState<{
    pay: AgreementServicePaymentApi;
    text: string;
    attachments: ServiceEvidenceAttachmentApi[];
    busy: boolean;
    uploading: boolean;
  } | null>(null);

  const lastMsg = useMarketStore((s) => {
    const msgs = s.threads[threadId]?.messages;
    return msgs && msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
  });
  const lastEvidenceRefreshMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setServicePaysBusy(true);
    void (async () => {
      try {
        const list = await listAgreementServicePayments(threadId, a.id);
        if (!cancelled) setServicePays(list);
      } catch (e) {
        if (!cancelled)
          toast.error(
            (e as Error)?.message ?? "No se pudieron cargar pagos de servicios.",
          );
      } finally {
        if (!cancelled) setServicePaysBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, a.id]);

  useEffect(() => {
    if (!lastMsg) return;
    if (lastEvidenceRefreshMsgIdRef.current === lastMsg.id) return;
    if (lastMsg.from !== "system") return;
    if (lastMsg.type !== "text") return;
    const t = (lastMsg.text ?? "").toLowerCase();
    if (!t.includes("evidencia")) return;
    lastEvidenceRefreshMsgIdRef.current = lastMsg.id;
    void (async () => {
      try {
        const list = await listAgreementServicePayments(threadId, a.id);
        setServicePays(list);
      } catch {
        // no-op: evitar spam de toasts por mensajes automáticos
      }
    })();
  }, [lastMsg, threadId, a.id]);

  const linkedSheet = a.routeSheetId
    ? routeSheets.find((r) => r.id === a.routeSheetId)
    : undefined;
  const linkedTitle = linkedSheet?.titulo;
  const routeLinked = !!a.routeSheetId;
  /** Hoja publicada: no se puede cambiar el roadmap vinculado ni desde el select ni sustituyendo la hoja. */
  const linkPublishedLocked =
    !!a.routeSheetId && !!linkedSheet?.publicadaPlataforma;
  const canUnlinkRoute =
    !!a.routeSheetId &&
    !linkedSheet?.publicadaPlataforma &&
    !!onUnlinkRouteSheet;
  const merchOkForRouteLink = agreementHasMerchandiseForRouteLink(a);
  const selectRouteSheetDisabled =
    linkPublishedLocked ||
    linkActionsDisabled ||
    (!!onLinkRouteSheet && !merchOkForRouteLink);
  const vincularDisabled =
    linkActionsDisabled ||
    linkPublishedLocked ||
    !pickId ||
    pickId === (a.routeSheetId ?? "") ||
    !merchOkForRouteLink;

  const routeSheetSelectOptions: VtSelectOption[] = useMemo(
    () => [
      { value: "", label: "Sin vincular — seleccionar…" },
      ...routeSheets.map((r) => ({
        value: r.id,
        label: r.publicadaPlataforma ? `${r.titulo} (publicada)` : r.titulo,
      })),
    ],
    [routeSheets],
  );

  return (
    <div className={agrDetailRoot}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Row label="Título" value={a.title} />
        </div>
        <button
          type="button"
          className={cn(
            "vt-btn vt-btn-sm inline-flex shrink-0 items-center gap-1.5",
          )}
          onClick={() => {
            void (async () => {
              try {
                await downloadTradeAgreementPdf(a, catalog);
                toast.success("PDF generado.");
              } catch {
                toast.error("No se pudo generar el PDF.");
              }
            })();
          }}
        >
          <Download size={14} aria-hidden />
          Descargar PDF
        </button>
      </div>

      {onLinkRouteSheet || a.routeSheetId || a.routeSheetUrl ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>Hoja de ruta (roadmap)</div>
          {onLinkRouteSheet ? (
            <>
              <p className={cn("vt-muted", agrDetailHint, "mb-2")}>
                Elige una sola hoja de ruta del chat para este acuerdo. Podés
                cambiarla mientras la hoja no esté publicada a transportistas.
              </p>
              {!merchOkForRouteLink ? (
                <p className={cn("vt-muted", agrDetailHint, "mb-2")}>
                  Solo podés vincular una hoja de ruta si el acuerdo incluye
                  mercancía con al menos una línea con cantidad, precio unitario y
                  moneda válidos.
                </p>
              ) : null}
              {routeSheets.length === 0 ? (
                <p className={cn("vt-muted", agrDetailHint)}>
                  No hay hojas de ruta en este chat. Crea una en la pestaña Rutas y
                  volvé para vincularla.
                </p>
              ) : (
                <>
                  {linkActionsDisabled ? (
                    <p className={cn("vt-muted", agrDetailHint, "mb-2")}>
                      La vinculación de hojas de ruta no está disponible hasta
                      registrar el pago en el chat.
                    </p>
                  ) : null}
                  <div className={linkRutaRow}>
                    <div className={linkRutaSelect}>
                      <span className={fieldLabel}>Roadmap vinculado</span>
                      <VtSelect
                        value={pickId}
                        onChange={setPickId}
                        options={routeSheetSelectOptions}
                        placeholder="Sin vincular — seleccionar…"
                        disabled={selectRouteSheetDisabled}
                        ariaLabel="Seleccionar hoja de ruta para el acuerdo"
                        listPortal
                        listPortalZIndexClass="z-[220]"
                      />
                    </div>
                    <button
                      type="button"
                      className="vt-btn vt-btn-primary shrink-0"
                      disabled={vincularDisabled}
                      onClick={() => {
                        if (!pickId || !onLinkRouteSheet || vincularDisabled)
                          return;
                        onLinkRouteSheet(a.id, pickId);
                      }}
                    >
                      {routeLinked &&
                      !linkPublishedLocked &&
                      pickId !== (a.routeSheetId ?? "")
                        ? "Actualizar vínculo"
                        : "Vincular"}
                    </button>
                    {canUnlinkRoute ? (
                      <button
                        type="button"
                        className="vt-btn shrink-0"
                        disabled={linkActionsDisabled}
                        onClick={() => {
                          if (linkActionsDisabled || !onUnlinkRouteSheet)
                            return;
                          onUnlinkRouteSheet(a.id);
                        }}
                      >
                        Desvincular
                      </button>
                    ) : null}
                  </div>
                  {linkPublishedLocked ? (
                    <p className={cn("vt-muted", agrDetailHint, "mt-1.5")}>
                      Esta hoja ya está{" "}
                      <strong className="text-[var(--text)]">publicada</strong>{" "}
                      en la plataforma: el roadmap vinculado no se puede modificar
                      ni quitar desde aquí.
                    </p>
                  ) : routeLinked ? (
                    <p className={cn("vt-muted", agrDetailHint, "mt-1.5")}>
                      Podés elegir otra hoja en el selector y usar «Actualizar
                      vínculo», o desvincular para dejar el acuerdo sin roadmap.
                    </p>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <p className={cn("vt-muted", agrDetailHint, "mb-2")}>
              Solo la tienda puede vincular o actualizar la hoja de ruta cuando
              el estado del acuerdo y el chat lo permitan.
            </p>
          )}
          {a.routeSheetId ? (
            <p className={cn("vt-muted", agrDetailHint, "mt-2")}>
              Vinculada ahora a:{" "}
              <strong>
                {linkedTitle ?? "hoja de ruta (sincronizando título…)"}
              </strong>
            </p>
          ) : null}
          {a.routeSheetId && onOpenRouteSheet ? (
            <button
              type="button"
              className="vt-btn vt-btn-sm mt-2"
              onClick={() => onOpenRouteSheet(a.routeSheetId!)}
            >
              Ver hoja de ruta en el panel
            </button>
          ) : null}
          {a.routeSheetUrl ? (
            <div className={cn(agrDetailRow, "mt-2.5")}>
              <div className={agrDetailLabel}>Enlace externo</div>
              <a
                href={a.routeSheetUrl}
                target="_blank"
                rel="noreferrer"
                className={agrDetailLink}
              >
                {a.routeSheetUrl}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {showMerch ? (
        <MerchandiseBlock lines={a.merchandise} catalog={catalog} />
      ) : null}

      {showMerch && merchandiseScopedExtraFields(a.extraFields).length ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>Otras cláusulas (mercancía)</div>
          <ExtraFieldClauseCards
            fields={merchandiseScopedExtraFields(a.extraFields)}
          />
        </div>
      ) : null}

      {showMerch && legacyMerchandiseMetaHasContent(m) ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>
            Mercancías · condiciones generales (acuerdo anterior)
          </div>
          <p className={cn("vt-muted", agrDetailHint, "mb-2")}>
            Estos datos eran comunes a todo el bloque; en acuerdos nuevos van
            por cada ítem.
          </p>
          <Row label="Moneda" value={m!.moneda} />
          <Row label="Tipo de embalaje" value={m!.tipoEmbalaje} />
          <Row
            label="Condiciones para devolver y garantias"
            value={m!.devolucionesDesc}
          />
          <Row
            label="Quién paga envío de devolución"
            value={m!.devolucionQuienPaga}
          />
          <Row label="Plazos (devolución)" value={m!.devolucionPlazos} />
          <Row
            label="Regulaciones, aduanas, restricciones, permisos"
            value={m!.regulaciones}
          />
        </div>
      ) : null}

      {showService &&
      (services.length > 0 ||
        serviceScopedExtraFields(a.extraFields).length) ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>Servicios</div>
          {services.map((sv, i) => {
            const linked = findStoreService(catalog, sv.linkedStoreServiceId);
            const paysForService = servicePays.filter(
              (p) => p.serviceItemId === sv.id,
            );
            return (
              <div key={sv.id} className="mb-4 last:mb-0">
                <div className={agrDetailSub}>Servicio {i + 1}</div>
                {linked ? (
                  <div className={cn(agrDetailRow, "mt-2")}>
                    <div className={agrDetailLabel}>Anclaje al catálogo</div>
                    <div className={agrDetailValue}>
                      {linked.tipoServicio} · {linked.category}
                    </div>
                  </div>
                ) : null}
                <div className="mt-2">
                  <ServiceItemPreview sv={sv} />
                </div>

                <div className="mt-3 rounded-xl border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                      Pagos y evidencia
                    </div>
                    {servicePaysBusy ? (
                      <div className="vt-muted text-[12px]">Cargando…</div>
                    ) : null}
                  </div>
                  {paysForService.length === 0 ? (
                    <div className="vt-muted mt-1 text-[13px]">
                      Aún no hay pagos registrados para este servicio.
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {paysForService.map((p) => {
                        const ev = p.evidence;
                        const evStatus = (ev?.status ?? "").trim().toLowerCase();
                        const released = p.status === "released";
                        const canEditSeller =
                          isActingSeller &&
                          !released &&
                          evStatus !== "accepted";
                        const canDecideBuyer =
                          !isActingSeller && evStatus === "submitted";
                        return (
                          <div
                            key={p.id}
                            className="rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--surface)_96%,transparent)] p-2.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0 text-[13px] font-bold text-[var(--text)]">
                                {released ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <BadgeCheck size={16} aria-hidden />
                                    Pago liberado
                                  </span>
                                ) : (
                                  "Pago retenido"
                                )}{" "}
                                <span className="vt-muted">
                                  — mes {p.entryMonth} día {p.entryDay}
                                </span>
                              </div>
                              <div className="font-mono text-[13px] font-bold">
                                {fmtMoneyMinor(p.amountMinor, p.currencyLower)}
                              </div>
                            </div>

                            <div className="vt-muted mt-1 text-[12px]">
                              Evidencia:{" "}
                              <b className="text-[var(--text)]">
                                {evStatus ? evStatus : "—"}
                              </b>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {(ev || canEditSeller) ? (
                                <button
                                  type="button"
                                  className="vt-btn vt-btn-sm inline-flex items-center gap-1.5"
                                  onClick={() =>
                                    setEvidenceModal({
                                      pay: p,
                                      text: ev?.text ?? "",
                                      attachments: ev?.attachments ?? [],
                                      busy: false,
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
                                          await decideServiceEvidence({
                                            threadId,
                                            agreementId: a.id,
                                            paymentId: p.id,
                                            decision: "accept",
                                          });
                                          toast.success("Evidencia aceptada.");
                                          const list =
                                            await listAgreementServicePayments(
                                              threadId,
                                              a.id,
                                            );
                                          setServicePays(list);
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
                                    className="vt-btn vt-btn-sm vt-btn-ghost inline-flex items-center gap-1.5 border border-[var(--border)]"
                                    onClick={() =>
                                      void (async () => {
                                        try {
                                          await decideServiceEvidence({
                                            threadId,
                                            agreementId: a.id,
                                            paymentId: p.id,
                                            decision: "reject",
                                          });
                                          toast.success("Evidencia rechazada.");
                                          const list =
                                            await listAgreementServicePayments(
                                              threadId,
                                              a.id,
                                            );
                                          setServicePays(list);
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
              </div>
            );
          })}
          {serviceScopedExtraFields(a.extraFields).length ? (
            <div className="mt-6 border-t border-[color-mix(in_oklab,var(--border)_72%,transparent)] pt-4">
              <div className={agrDetailSub}>Otras cláusulas (servicio)</div>
              <ExtraFieldClauseCards
                fields={serviceScopedExtraFields(a.extraFields)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {legacyCombinedExtraFields(a.extraFields).length ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>Campos adicionales conjuntos (histórico)</div>
          <p className={cn("vt-muted", agrDetailHint, "mb-2 text-[13px]")}>
            Pactados cuando el bloque mercancía y el de servicios compartían una
            sola lista de cláusulas extra.
          </p>
          <ExtraFieldClauseCards
            fields={legacyCombinedExtraFields(a.extraFields)}
          />
        </div>
      ) : null}

      {evidenceModal ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <div className="text-[13px] font-black text-[var(--text)]">
                  Evidencia — mes {evidenceModal.pay.entryMonth} día{" "}
                  {evidenceModal.pay.entryDay}
                </div>
                <div className="vt-muted mt-0.5 text-[12px]">
                  {fmtMoneyMinor(
                    evidenceModal.pay.amountMinor,
                    evidenceModal.pay.currencyLower,
                  )}{" "}
                  · Estado pago: {evidenceModal.pay.status}
                </div>
              </div>
              <button
                type="button"
                className="vt-btn vt-btn-ghost inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-2"
                onClick={() => setEvidenceModal(null)}
                disabled={evidenceModal.busy}
              >
                <XCircle size={16} aria-hidden /> Cerrar
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
              {isActingSeller ? (
                <>
                  <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                    Texto
                  </div>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-[13px] text-[var(--text)] outline-none"
                    rows={6}
                    value={evidenceModal.text}
                    onChange={(e) =>
                      setEvidenceModal((m) =>
                        m ? { ...m, text: e.target.value } : m,
                      )
                    }
                    placeholder="Describe la evidencia del servicio…"
                    disabled={evidenceModal.busy}
                  />

                  <div className="mt-3 text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                    Adjuntos
                  </div>
                  <p className="vt-muted mt-1 text-[12px]">
                    Podés subir imágenes o documentos.
                  </p>
                  <EvidenceAttachmentsList
                    atts={evidenceModal.attachments}
                    onRemove={(id) =>
                      setEvidenceModal((m) =>
                        m
                          ? {
                              ...m,
                              attachments: m.attachments.filter((a) => a.id !== id),
                            }
                          : m,
                      )
                    }
                  />

                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] px-3 py-2 text-[13px] font-semibold text-[var(--text)]">
                    <Upload size={16} aria-hidden />
                    Subir archivos
                    {evidenceModal.uploading ? (
                      <Loader2 className="animate-spin" size={16} aria-hidden />
                    ) : null}
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        e.target.value = "";
                        if (!files.length) return;
                        void (async () => {
                          setEvidenceModal((m) =>
                            m ? { ...m, busy: true, uploading: true } : m,
                          );
                          try {
                            const uploaded: ServiceEvidenceAttachmentApi[] = [];
                            for (const f of files) {
                              const r = await uploadMedia(f);
                              const kind =
                                r.mimeType?.startsWith("image/") ?
                                  "image"
                                : "document";
                              uploaded.push({
                                id: crypto.randomUUID(),
                                url: mediaApiUrl(r.id),
                                fileName: r.fileName,
                                kind,
                              });
                            }
                            setEvidenceModal((m) =>
                              m
                                ? {
                                    ...m,
                                    attachments: [...m.attachments, ...uploaded],
                                  }
                                : m,
                            );
                          } catch (err) {
                            toast.error(
                              (err as Error)?.message ??
                                "No se pudo subir el adjunto.",
                            );
                          } finally {
                            setEvidenceModal((m) =>
                              m ? { ...m, busy: false, uploading: false } : m,
                            );
                          }
                        })();
                      }}
                      disabled={evidenceModal.busy}
                    />
                  </label>
                </>
              ) : evidenceModal.pay.evidence ? (
                <>
                  <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                    Texto
                  </div>
                  <div className="mt-1 whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-[13px] text-[var(--text)]">
                    {evidenceModal.pay.evidence.text?.trim() || "—"}
                  </div>
                  <div className="mt-3 text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                    Adjuntos
                  </div>
                  <EvidenceAttachmentsList
                    atts={evidenceModal.pay.evidence.attachments ?? []}
                  />
                </>
              ) : (
                <div className="vt-muted text-[13px]">
                  Aún no hay evidencia cargada.
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
              {isActingSeller ? (
                <>
                  {(() => {
                    const original = evidenceModal.pay.evidence;
                    const a0 = normalizeEvidenceForCompare(
                      original?.text ?? "",
                      original?.attachments ?? [],
                    );
                    const a1 = normalizeEvidenceForCompare(
                      evidenceModal.text,
                      evidenceModal.attachments,
                    );
                    const dirty = a0.text !== a1.text || a0.attsKey !== a1.attsKey;
                    const noChanges = !dirty;
                    const disabled = evidenceModal.busy || noChanges;
                    return (
                      <>
                  <button
                    type="button"
                    className="vt-btn vt-btn-ghost inline-flex items-center gap-2 border border-[var(--border)] px-5 py-2.5"
                    disabled={disabled}
                    onClick={() =>
                      void (async () => {
                        if (noChanges) {
                          toast.error("No hay cambios para guardar.");
                          return;
                        }
                        setEvidenceModal((m) => (m ? { ...m, busy: true } : m));
                        try {
                          await upsertServiceEvidence({
                            threadId,
                            agreementId: a.id,
                            paymentId: evidenceModal.pay.id,
                            text: evidenceModal.text,
                            attachments: evidenceModal.attachments,
                            submit: false,
                          });
                          toast.success("Evidencia guardada.");
                          const list = await listAgreementServicePayments(
                            threadId,
                            a.id,
                          );
                          setServicePays(list);
                          setEvidenceModal(null);
                        } catch (e) {
                          toast.error(
                            (e as Error)?.message ??
                              "No se pudo guardar la evidencia.",
                          );
                        } finally {
                          setEvidenceModal((m) =>
                            m ? { ...m, busy: false } : m,
                          );
                        }
                      })()
                    }
                  >
                    <Pencil size={16} aria-hidden />
                    Guardar borrador
                  </button>
                  <button
                    type="button"
                    className="vt-btn vt-btn-primary inline-flex items-center gap-2"
                    disabled={disabled}
                    onClick={() =>
                      void (async () => {
                        if (noChanges) {
                          toast.error("No hay cambios para enviar.");
                          return;
                        }
                        const lastSent = evidenceModal.pay.evidence;
                        const lastSentNorm = normalizeEvidenceForCompare(
                          lastSent?.lastSubmittedText ?? "",
                          lastSent?.lastSubmittedAttachments ?? [],
                        );
                        const nowNorm = normalizeEvidenceForCompare(
                          evidenceModal.text,
                          evidenceModal.attachments,
                        );
                        if (
                          lastSentNorm.text === nowNorm.text &&
                          lastSentNorm.attsKey === nowNorm.attsKey
                        ) {
                          toast.error(
                            "No hay cambios desde la última evidencia enviada.",
                          );
                          return;
                        }
                        setEvidenceModal((m) => (m ? { ...m, busy: true } : m));
                        try {
                          await upsertServiceEvidence({
                            threadId,
                            agreementId: a.id,
                            paymentId: evidenceModal.pay.id,
                            text: evidenceModal.text,
                            attachments: evidenceModal.attachments,
                            submit: true,
                          });
                          toast.success("Evidencia enviada.");
                          const list = await listAgreementServicePayments(
                            threadId,
                            a.id,
                          );
                          setServicePays(list);
                          setEvidenceModal(null);
                        } catch (e) {
                          toast.error(
                            (e as Error)?.message ??
                              "No se pudo enviar la evidencia.",
                          );
                        } finally {
                          setEvidenceModal((m) =>
                            m ? { ...m, busy: false } : m,
                          );
                        }
                      })()
                    }
                  >
                    <BadgeCheck size={16} aria-hidden />
                    Enviar evidencia
                  </button>
                      </>
                    );
                  })()}
                </>
              ) : (evidenceModal.pay.evidence?.status ?? "")
                    .trim()
                    .toLowerCase() === "submitted" ? (
                <>
                  <button
                    type="button"
                    className="vt-btn vt-btn-primary inline-flex items-center gap-2"
                    disabled={evidenceModal.busy}
                    onClick={() =>
                      void (async () => {
                        setEvidenceModal((m) => (m ? { ...m, busy: true } : m));
                        try {
                          await decideServiceEvidence({
                            threadId,
                            agreementId: a.id,
                            paymentId: evidenceModal.pay.id,
                            decision: "accept",
                          });
                          toast.success("Evidencia aceptada.");
                          const list = await listAgreementServicePayments(
                            threadId,
                            a.id,
                          );
                          setServicePays(list);
                          setEvidenceModal(null);
                        } catch (e) {
                          toast.error(
                            (e as Error)?.message ??
                              "No se pudo aceptar la evidencia.",
                          );
                        } finally {
                          setEvidenceModal((m) =>
                            m ? { ...m, busy: false } : m,
                          );
                        }
                      })()
                    }
                  >
                    <BadgeCheck size={16} aria-hidden /> Aceptar
                  </button>
                  <button
                    type="button"
                    className="vt-btn vt-btn-ghost inline-flex items-center gap-2 border border-[var(--border)] px-5 py-2.5"
                    disabled={evidenceModal.busy}
                    onClick={() =>
                      void (async () => {
                        setEvidenceModal((m) => (m ? { ...m, busy: true } : m));
                        try {
                          await decideServiceEvidence({
                            threadId,
                            agreementId: a.id,
                            paymentId: evidenceModal.pay.id,
                            decision: "reject",
                          });
                          toast.success("Evidencia rechazada.");
                          const list = await listAgreementServicePayments(
                            threadId,
                            a.id,
                          );
                          setServicePays(list);
                          setEvidenceModal(null);
                        } catch (e) {
                          toast.error(
                            (e as Error)?.message ??
                              "No se pudo rechazar la evidencia.",
                          );
                        } finally {
                          setEvidenceModal((m) =>
                            m ? { ...m, busy: false } : m,
                          );
                        }
                      })()
                    }
                  >
                    <XCircle size={16} aria-hidden /> Rechazar
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
