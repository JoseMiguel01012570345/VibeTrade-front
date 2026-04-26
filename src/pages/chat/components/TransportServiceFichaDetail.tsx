import type { PublishedTransportServiceDto } from '../../../utils/market/publishedTransportServicesApi'

type Props = { s: PublishedTransportServiceDto }

/**
 * Detalle de ficha de servicio de transporte (vitrina / oferta pública).
 * Usado en modales de elección de servicio y en el visor de tramo del rail.
 */
export function TransportServiceFichaDetail({ s }: Props) {
  const photos = Array.isArray(s.photoUrls)
    ? s.photoUrls.filter((u) => typeof u === 'string' && u.trim())
    : []
  return (
    <div className="min-w-0 space-y-2 text-sm">
      <div className="font-extrabold text-[var(--text)]">
        {(s.tipoServicio ?? '').trim() || 'Servicio'}
        {(s.category ?? '').trim() ? (
          <span className="vt-muted ml-2 font-semibold">· {(s.category ?? '').trim()}</span>
        ) : null}
      </div>
      {(s.storeName ?? '').trim() ? (
        <div className="text-xs font-semibold text-[var(--muted)]">{(s.storeName ?? '').trim()}</div>
      ) : null}
      {photos.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {photos.slice(0, 6).map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="h-14 w-14 rounded-lg border border-[var(--border)] object-cover"
            />
          ))}
        </div>
      ) : null}
      {(s.descripcion ?? '').trim() ? (
        <p className="leading-snug text-[var(--text)]">{(s.descripcion ?? '').trim()}</p>
      ) : null}
      {(s.incluye ?? '').trim() ? (
        <div>
          <div className="text-[11px] font-bold text-[var(--muted)]">Incluye</div>
          <div className="whitespace-pre-wrap">{(s.incluye ?? '').trim()}</div>
        </div>
      ) : null}
      {(s.noIncluye ?? '').trim() ? (
        <div>
          <div className="text-[11px] font-bold text-[var(--muted)]">No incluye</div>
          <div className="whitespace-pre-wrap">{(s.noIncluye ?? '').trim()}</div>
        </div>
      ) : null}
      {(s.entregables ?? '').trim() ? (
        <div>
          <div className="text-[11px] font-bold text-[var(--muted)]">Entregables</div>
          <div className="whitespace-pre-wrap">{(s.entregables ?? '').trim()}</div>
        </div>
      ) : null}
      {(s.propIntelectual ?? '').trim() ? (
        <div>
          <div className="text-[11px] font-bold text-[var(--muted)]">Propiedad intelectual</div>
          <div className="whitespace-pre-wrap">{(s.propIntelectual ?? '').trim()}</div>
        </div>
      ) : null}
    </div>
  )
}
