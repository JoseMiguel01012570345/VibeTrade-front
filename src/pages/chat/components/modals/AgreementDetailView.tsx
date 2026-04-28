import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Download } from "lucide-react";
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
import { downloadTradeAgreementPdf } from "../../utils/tradeAgreementPdfDownload";
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
  onOpenRouteSheet,
  routeSheets = [],
  onLinkRouteSheet,
  onUnlinkRouteSheet,
  linkActionsDisabled = false,
}: {
  a: TradeAgreement;
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
  const selectRouteSheetDisabled = linkPublishedLocked || linkActionsDisabled;
  const vincularDisabled =
    linkActionsDisabled ||
    linkPublishedLocked ||
    !pickId ||
    pickId === (a.routeSheetId ?? "");

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
            try {
              downloadTradeAgreementPdf(a, catalog);
              toast.success("PDF generado.");
            } catch {
              toast.error("No se pudo generar el PDF.");
            }
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
                Elegí una sola hoja de ruta del chat para este acuerdo. Podés
                cambiarla mientras la hoja no esté publicada a transportistas.
              </p>
              {routeSheets.length === 0 ? (
                <p className={cn("vt-muted", agrDetailHint)}>
                  No hay hojas de ruta en este chat. Creá una en la pestaña Rutas y
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
    </div>
  );
}
