import { useEffect, useState } from "react";
import { useMarketStore } from "../../../../app/store/useMarketStore";
import { cn } from "../../../../lib/cn";
import {
  agreementDeclaresMerchandise,
  agreementDeclaresService,
  normalizeAgreementServices,
  normalizeMerchandiseLine,
  type MerchandiseLine,
  type MerchandiseSectionMeta,
  type TradeAgreement,
} from "../../domain/tradeAgreementTypes";
import { hasMerchandise } from "../../domain/tradeAgreementValidation";
import type { StoreCatalog } from "../../domain/storeCatalogTypes";
import { findStoreProduct, findStoreService } from "../../domain/storeCatalogTypes";
import { ServiceItemPreview } from "./serviceConfig/ServiceItemPreview";
import type { RouteSheet } from "../../domain/routeSheetTypes";
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

function legacyMerchandiseMetaHasContent(m?: MerchandiseSectionMeta): boolean {
  if (!m) return false;
  return Object.values(m).some((v) => (v ?? "").trim() !== "");
}

function MerchandiseBlock({ lines, catalog }: { lines: MerchandiseLine[]; catalog?: StoreCatalog }) {
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
            {linked ? (
              <Row
                label="Anclaje al catálogo"
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
            <Row label="Tipo de embalaje" value={line.tipoEmbalaje} />
            <Row
              label="Condiciones para devolver y garantias"
              value={line.devolucionesDesc}
            />
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
  const hasGoods = hasMerchandise({ merchandise: a.merchandise });

  const [pickId, setPickId] = useState(a.routeSheetId ?? "");
  useEffect(() => {
    setPickId(a.routeSheetId ?? "");
  }, [a.id, a.routeSheetId]);

  const linkedSheet = a.routeSheetId
    ? routeSheets.find((r) => r.id === a.routeSheetId)
    : undefined;
  const linkedTitle = linkedSheet?.titulo;
  const routeLinked = !!a.routeSheetId;
  /** Publicada: sin desvincular ni desde aquí. */
  const linkPublishedLocked =
    !!a.routeSheetId && !!linkedSheet?.publicadaPlataforma;
  const canUnlinkRoute =
    !!a.routeSheetId &&
    !linkedSheet?.publicadaPlataforma &&
    !!onUnlinkRouteSheet;

  return (
    <div className={agrDetailRoot}>
      <Row label="Título" value={a.title} />

      {showMerch && hasGoods ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>Hoja de ruta</div>
          {onLinkRouteSheet ? (
            routeSheets.length === 0 ? (
              <p className={cn("vt-muted", agrDetailHint)}>
                No hay hojas de ruta en este chat. Creá una en la pestaña Rutas
                y volvé para vincularla.
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
                  <label className={linkRutaSelect}>
                    <span className={fieldLabel}>Elegir hoja</span>
                    <select
                      className="vt-input"
                      value={pickId}
                      disabled={routeLinked || linkActionsDisabled}
                      onChange={(e) => setPickId(e.target.value)}
                    >
                      <option value="">Seleccionar…</option>
                      {routeSheets.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.titulo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="vt-btn vt-btn-primary shrink-0"
                    disabled={
                      linkActionsDisabled ||
                      routeLinked ||
                      !pickId ||
                      pickId === (a.routeSheetId ?? "")
                    }
                    onClick={() => {
                      if (
                        !pickId ||
                        !onLinkRouteSheet ||
                        routeLinked ||
                        linkActionsDisabled
                      )
                        return;
                      onLinkRouteSheet(a.id, pickId);
                    }}
                  >
                    Vincular
                  </button>
                  {canUnlinkRoute ? (
                    <button
                      type="button"
                      className="vt-btn shrink-0"
                      disabled={linkActionsDisabled}
                      onClick={() => {
                        if (linkActionsDisabled || !onUnlinkRouteSheet) return;
                        onUnlinkRouteSheet(a.id);
                      }}
                    >
                      Desvincular
                    </button>
                  ) : null}
                </div>
                {linkPublishedLocked ? (
                  <p className={cn("vt-muted", agrDetailHint, "mt-1.5")}>
                    La hoja ya está publicada en la plataforma: el vínculo no se
                    puede cambiar ni quitar desde aquí.
                  </p>
                ) : a.routeSheetId ? (
                  <p className={cn("vt-muted", agrDetailHint, "mt-1.5")}>
                    Con una hoja vinculada, la elección queda fija; podés
                    desvincular para elegir otra mientras la hoja no esté
                    publicada en la plataforma.
                  </p>
                ) : null}
              </>
            )
          ) : null}
          {a.routeSheetId && linkedTitle ? (
            <p className={cn("vt-muted", agrDetailHint)}>
              Vinculada a: <strong>{linkedTitle}</strong>
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

      {showMerch ? <MerchandiseBlock lines={a.merchandise} catalog={catalog} /> : null}

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

      {showService && services.length > 0 ? (
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
        </div>
      ) : null}
    </div>
  );
}
