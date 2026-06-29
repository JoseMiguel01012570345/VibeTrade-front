import { cn } from '@shared/lib/cn'
import { ProtectedMediaImg } from '@shared/components/media/ProtectedMediaImg'
import {
  normalizeMerchandiseLine,
  type MerchandiseLine,
  type MerchandiseSectionMeta,
  type TradeAgreementExtraFieldDraft,
} from '@features/chat/model/tradeAgreementTypes'
import type {
  StoreCatalog,
  StoreProduct,
} from '@features/market/model/storeCatalogTypes'
import { findStoreProduct } from '@features/market/model/storeCatalogTypes'
import type { ServiceEvidenceAttachmentApi } from '@features/chat/api/agreementServiceEvidenceApi'
import {
  minorToMajor,
  currencyMinorDecimals,
} from '@features/payments/model/paymentFeePolicy'
import {
  agrDetailBlock,
  agrDetailCard,
  agrDetailH,
  agrDetailLabel,
  agrDetailLink,
  agrDetailRow,
  agrDetailSub,
  agrDetailValue,
} from '../../model/formModalStyles'

export function AgreementDetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  if (!value.trim()) return null
  return (
    <div className={agrDetailRow}>
      <div className={agrDetailLabel}>{label}</div>
      <div className={agrDetailValue}>{value}</div>
    </div>
  )
}

export function fmtAgreementMoneyMinor(
  amountMinor: number,
  currencyLower: string,
): string {
  const cur = currencyLower.trim().toLowerCase()
  const pow = currencyMinorDecimals(cur)
  const maj = minorToMajor(amountMinor, cur)
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur.toUpperCase(),
      maximumFractionDigits: pow,
    }).format(maj)
  } catch {
    return `${maj.toFixed(pow)} ${cur.toUpperCase()}`
  }
}

export function normalizeEvidenceForCompare(
  text: string,
  atts: ServiceEvidenceAttachmentApi[],
): { text: string; attsKey: string } {
  const t = (text ?? '').trim()
  const key = (atts ?? [])
    .map((a) => ({
      url: (a.url ?? '').trim(),
      fileName: (a.fileName ?? '').trim(),
      kind: (a.kind ?? '').trim(),
    }))
    .sort((a, b) =>
      `${a.url}|${a.fileName}|${a.kind}`.localeCompare(
        `${b.url}|${b.fileName}|${b.kind}`,
        'es',
      ),
    )
    .map((a) => `${a.url}|${a.fileName}|${a.kind}`)
    .join(';;')
  return { text: t, attsKey: key }
}

export function ExtraFieldClauseCards({
  fields,
}: {
  fields: TradeAgreementExtraFieldDraft[]
}) {
  if (!fields.length) return null
  return (
    <>
      {fields.map((f) => (
        <div
          key={f.id}
          className="mb-4 rounded-xl border border-[color-mix(in_oklab,var(--border)_72%,transparent)] p-3 last:mb-0"
        >
          <div className="mb-2 font-extrabold text-[var(--text)]">
            {f.title.trim() || '(sin título)'}
          </div>
          {f.valueKind === 'text' && (f.textValue ?? '').trim() ? (
            <div className="whitespace-pre-wrap text-sm text-[var(--text)]">
              {(f.textValue ?? '').trim()}
            </div>
          ) : null}
          {f.valueKind === 'image' && (f.mediaUrl ?? '').trim() ? (
            <div className="mt-2 max-w-lg">
              <ProtectedMediaImg
                src={(f.mediaUrl ?? '').trim()}
                alt=""
                className="max-h-72 w-full rounded border border-[var(--border)] object-contain"
              />
            </div>
          ) : null}
          {f.valueKind === 'document' && (f.mediaUrl ?? '').trim() ? (
            <a
              href={(f.mediaUrl ?? '').trim()}
              target="_blank"
              rel="noreferrer"
              className={agrDetailLink}
            >
              {f.fileName?.trim() || 'Abrir documento adjunto'}
            </a>
          ) : null}
        </div>
      ))}
    </>
  )
}

export function legacyMerchandiseMetaHasContent(
  m?: MerchandiseSectionMeta,
): boolean {
  if (!m) return false
  return Object.values(m).some((v) => (v ?? '').trim() !== '')
}

function FichaProductoExcerpt({ p }: { p: StoreProduct }) {
  return (
    <div className="mb-2 space-y-2 rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] p-2.5 text-[13px]">
      <div className="font-extrabold text-[var(--text)]">Ficha de producto</div>
      {p.model?.trim() ? (
        <AgreementDetailRow label="Versión / modelo" value={p.model} />
      ) : null}
      {p.shortDescription?.trim() ? (
        <p className="whitespace-pre-wrap text-[var(--text)]">
          {p.shortDescription}
        </p>
      ) : null}
      {p.mainBenefit?.trim() ? (
        <AgreementDetailRow label="Beneficio principal" value={p.mainBenefit} />
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
        <AgreementDetailRow label="Contenido incluido" value={p.contentIncluded} />
      ) : null}
      {p.usageConditions?.trim() ? (
        <AgreementDetailRow label="Condiciones de uso" value={p.usageConditions} />
      ) : null}
      {p.taxesShippingInstall?.trim() ? (
        <AgreementDetailRow
          label="Envío / impuestos (ficha)"
          value={p.taxesShippingInstall}
        />
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
                        className={cn(agrDetailLink, 'inline')}
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
  )
}

export function MerchandiseBlock({
  lines,
  catalog,
}: {
  lines: MerchandiseLine[]
  catalog?: StoreCatalog
}) {
  if (!lines.length) return null
  return (
    <div className={agrDetailBlock}>
      <div className={agrDetailH}>Mercancías</div>
      {lines.map((raw, i) => {
        const line = normalizeMerchandiseLine(raw)
        const linked = findStoreProduct(catalog, line.linkedStoreProductId)
        return (
          <div key={i} className={agrDetailCard}>
            <div className={agrDetailSub}>Ítem {i + 1}</div>
            {linked ? <FichaProductoExcerpt p={linked} /> : null}
            {linked ? (
              <AgreementDetailRow
                label="Producto (catálogo)"
                value={`${linked.name} · ${linked.category}`}
              />
            ) : null}
            <AgreementDetailRow label="Tipo" value={line.tipo} />
            <AgreementDetailRow label="Cantidad" value={line.cantidad} />
            <AgreementDetailRow label="Valor unitario" value={line.valorUnitario} />
            <AgreementDetailRow label="Estado" value={line.estado} />
            <AgreementDetailRow label="Descuento" value={line.descuento} />
            <AgreementDetailRow label="Impuestos" value={line.impuestos} />
            <AgreementDetailRow label="Moneda" value={line.moneda} />
            <AgreementDetailRow
              label="Condiciones para devolver y garantias (ficha)"
              value={line.devolucionesDesc}
            />
            <div className="my-1 border-t border-[color-mix(in_oklab,var(--border)_70%,transparent)] pt-1 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
              Comprador
            </div>
            <AgreementDetailRow label="Tipo de embalaje" value={line.tipoEmbalaje} />
            <AgreementDetailRow
              label="Quién paga envío de devolución"
              value={line.devolucionQuienPaga}
            />
            <AgreementDetailRow label="Plazos (devolución)" value={line.devolucionPlazos} />
            <AgreementDetailRow
              label="Regulaciones, aduanas, restricciones, permisos"
              value={line.regulaciones}
            />
          </div>
        )
      })}
    </div>
  )
}
