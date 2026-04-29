import { cn } from '../../lib/cn'
import type {
  RouteOfferPublicState,
  RouteOfferTramoAssignment,
  RouteOfferTramoPublic,
} from '../../app/store/marketStoreTypes'
import { routeStatusLabel, type RouteSheetStatus } from '../chat/domain/routeSheetTypes'
import { formatRouteEstimadoDisplay } from '../chat/domain/routeSheetDateTime'

function trustHue(score: number): number {
  const t = Math.max(0, Math.min(100, score)) / 100
  return t * 120
}

function MicroTrustBar({ score }: { score: number }) {
  return (
    <div className="flex min-w-0 max-w-[140px] flex-1 items-center gap-1.5" title={`Confianza: ${score}`}>
      <div className="h-1.5 min-w-[56px] flex-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--border)_75%,transparent)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, score))}%`,
            backgroundColor: `hsl(${trustHue(score)}, 65%, 40%)`,
          }}
        />
      </div>
      <span className="shrink-0 font-mono text-[10px] font-black tabular-nums text-[var(--muted)]">
        {score}
      </span>
    </div>
  )
}

function AssignmentBlock({ a }: { a: RouteOfferTramoAssignment }) {
  const pending = a.status === 'pending'
  return (
    <div
      className={cn(
        'rounded-lg border px-2 py-1.5 text-[11px] leading-snug',
        pending ?
          'border-[color-mix(in_oklab,#d97706_35%,var(--border))] bg-[color-mix(in_oklab,#d97706_8%,var(--surface))]'
        : 'border-[color-mix(in_oklab,var(--good)_30%,var(--border))] bg-[color-mix(in_oklab,var(--good)_7%,var(--surface))]',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-extrabold text-[var(--text)]">{a.displayName}</span>
        {pending ?
          <span className="rounded bg-[color-mix(in_oklab,#d97706_18%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-[color-mix(in_oklab,#b45309_95%,var(--text))]">
            Pendiente validación
          </span>
        : <span className="text-[10px] font-bold text-[color-mix(in_oklab,var(--good)_90%,var(--muted))]">Validado</span>}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <MicroTrustBar score={a.trustScore} />
      </div>
      {a.vehicleLabel ?
        <div className="mt-1 text-[10px] text-[var(--muted)]">Unidad (referencia): {a.vehicleLabel}</div>
      : null}
    </div>
  )
}

function tramoPhoneLine(telefonoHoja: string | undefined, telefonoAsignacion: string | undefined): string | null {
  const h = telefonoHoja?.trim()
  const a = telefonoAsignacion?.trim()
  if (h) return h
  if (a) return a
  return null
}

function tramoLine(origen: string, destino: string): string {
  const o = origen.trim()
  const d = destino.trim()
  if (o || d) return `${o || '…'} → ${d || '…'}`
  return 'Tramo sin datos'
}

function TramoPublicDetails({ t, compact }: { t: RouteOfferTramoPublic; compact: boolean }) {
  const rows: { label: string; value: string }[] = []
  if (t.cargaEnTramo?.trim()) rows.push({ label: 'Carga en el tramo', value: t.cargaEnTramo.trim() })
  if (t.tipoMercanciaCarga?.trim())
    rows.push({ label: 'Tipo mercancía (carga)', value: t.tipoMercanciaCarga.trim() })
  if (t.tipoMercanciaDescarga?.trim())
    rows.push({ label: 'Tipo mercancía (descarga)', value: t.tipoMercanciaDescarga.trim() })
  if (t.tipoVehiculoRequerido?.trim())
    rows.push({ label: 'Vehículo requerido (hoja)', value: t.tipoVehiculoRequerido.trim() })
  if (t.tiempoRecogidaEstimado?.trim() || t.tiempoEntregaEstimado?.trim()) {
    rows.push({
      label: 'Ventana estimada (recogida → entrega)',
      value: [
        formatRouteEstimadoDisplay(t.tiempoRecogidaEstimado),
        formatRouteEstimadoDisplay(t.tiempoEntregaEstimado),
      ]
        .filter(Boolean)
        .join(' → '),
    })
  }
  if (t.precioTransportista?.trim())
    rows.push({ label: 'Tarifa transportista (demo)', value: t.precioTransportista.trim() })
  if (t.monedaPago?.trim())
    rows.push({ label: 'Moneda de pago (tramo)', value: t.monedaPago.trim() })
  if (t.notas?.trim()) rows.push({ label: 'Notas del tramo', value: t.notas.trim() })
  if (t.requisitosEspeciales?.trim())
    rows.push({ label: 'Requisitos / especiales', value: t.requisitosEspeciales.trim() })

  if (rows.length === 0) return null

  const max = compact ? 3 : rows.length
  const shown = rows.slice(0, max)

  return (
    <dl className={cn('m-0 space-y-1.5', compact ? 'mt-1.5' : 'mt-2')}>
      {shown.map((r) => (
        <div key={r.label}>
          <dt className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">{r.label}</dt>
          <dd className="mt-0.5 text-[11px] leading-snug text-[var(--text)]">{r.value}</dd>
        </div>
      ))}
      {compact && rows.length > max ?
        <div className="text-[10px] font-bold text-[var(--muted)]">+{rows.length - max} datos más en la ficha</div>
      : null}
    </dl>
  )
}

type Props = {
  state: RouteOfferPublicState
  compact?: boolean
  className?: string
  /** Si es false, no muestra la línea «origen → destino» (p. ej. cuando va un mapa arriba). */
  showTramoAddresses?: boolean
}

export function RouteOfferPreview({ state, compact, className, showTramoAddresses = true }: Props) {
  const estadoLabel = state.hojaEstado ?
      routeStatusLabel(state.hojaEstado as RouteSheetStatus)
    : null

  return (
    <div
      className={cn(
        'rounded-xl border border-[color-mix(in_oklab,var(--border)_90%,transparent)] bg-[color-mix(in_oklab,var(--bg)_65%,var(--surface))]',
        compact ? 'p-2.5' : 'p-3',
        className,
      )}
    >
      <div className={cn('font-extrabold text-[var(--text)]', compact ? 'text-xs' : 'text-sm')}>
        Hoja de ruta · {state.routeTitle}
      </div>
      {estadoLabel ?
        <div className="vt-muted mt-1 text-[10px] font-bold uppercase tracking-wide">
          Estado de la hoja: {estadoLabel}
        </div>
      : null}
      {state.mercanciasResumen ?
        <p className="vt-muted mt-1 text-[11px] leading-snug">{state.mercanciasResumen}</p>
      : null}
      {state.notasGenerales && !compact ?
        <p className="vt-muted mt-2 border-t border-dashed border-[color-mix(in_oklab,var(--border)_70%,transparent)] pt-2 text-[11px] leading-snug">
          <span className="font-extrabold text-[var(--text)]">Notas generales: </span>
          {state.notasGenerales}
        </p>
      : null}
      {state.notasGenerales && compact ?
        <p className="vt-muted mt-1 line-clamp-2 text-[10px] leading-snug">{state.notasGenerales}</p>
      : null}

      <ul className={cn('m-0 list-none p-0', compact ? 'mt-2 space-y-2' : 'mt-3 space-y-3')}>
        {state.tramos.map((t) => {
          const telTramo = tramoPhoneLine(t.telefonoTransportista, t.assignment?.phone)
          return (
            <li
              key={t.stopId}
              className="border-t border-dashed border-[color-mix(in_oklab,var(--border)_70%,transparent)] pt-2 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="text-[11px] font-black text-[var(--muted)]">Tramo {t.orden}</span>
                {showTramoAddresses ?
                  <span className={cn('min-w-0 font-bold text-[var(--text)]', compact ? 'text-[11px]' : 'text-[12px]')}>
                    {tramoLine(t.origenLine, t.destinoLine)}
                  </span>
                : null}
              </div>
              {telTramo ?
                <div className={cn('mt-1', compact ? 'text-[10px]' : 'text-[11px]')}>
                  <span className="font-extrabold text-[var(--muted)]">Teléfono del tramo: </span>
                  <span className="font-mono font-bold tabular-nums text-[var(--text)]">{telTramo}</span>
                </div>
              : null}
              <TramoPublicDetails t={t} compact={!!compact} />
              {t.assignment ?
                <div className={compact ? 'mt-1.5' : 'mt-2'}>
                  <AssignmentBlock a={t.assignment} />
                </div>
              : <div className="vt-muted mt-1.5 text-[11px] font-semibold">Libre — puedes suscribirte a este tramo</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
