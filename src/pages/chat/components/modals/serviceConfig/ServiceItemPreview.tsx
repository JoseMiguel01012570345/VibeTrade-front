import { CalendarClock, ClipboardList, CreditCard, Scale, ShieldAlert } from 'lucide-react'
import { ProtectedMediaImg } from '../../../../../components/media/ProtectedMediaImg'
import { agrDetailLink } from '../../../styles/formModalStyles'
import { monedasFromRecurrenciaPagos, type ServiceItem, type TradeAgreementExtraFieldDraft } from '../../../domain/tradeAgreementTypes'
import { formatPaymentSummary } from './serviceItemFormat'
import { ServiceScheduleReadView } from './ServiceScheduleReadView'

const MES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const

const sectionClass =
  'rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--surface)_96%,var(--bg))] p-3.5'

const sectionTitleClass = 'mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]'

const pillOn = 'rounded-full border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] px-2 py-0.5 text-[11px] font-bold text-[var(--text)]'
const pillOff = 'rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]'

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-bold text-[var(--muted)]">{label}</div>
      <div className="whitespace-pre-wrap text-sm leading-snug text-[var(--text)]">{children}</div>
    </div>
  )
}

function CondicionesExtrasCards({ fields }: { fields: TradeAgreementExtraFieldDraft[] }) {
  if (!fields.length) return null
  return (
    <div className="mt-3 space-y-3 border-t border-[var(--border)] pt-3">
      <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        Otras características o cláusulas (servicio)
      </div>
      {fields.map((f) => (
        <div
          key={f.id}
          className="rounded-xl border border-[color-mix(in_oklab,var(--border)_72%,transparent)] p-3 last:mb-0"
        >
          <div className="mb-2 font-extrabold text-[var(--text)]">{f.title.trim() || '(sin título)'}</div>
          {f.valueKind === 'text' && (f.textValue ?? '').trim() ? (
            <div className="whitespace-pre-wrap text-sm text-[var(--text)]">{(f.textValue ?? '').trim()}</div>
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
            <a href={(f.mediaUrl ?? '').trim()} target="_blank" rel="noreferrer" className={agrDetailLink}>
              {f.fileName?.trim() || 'Abrir documento adjunto'}
            </a>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function ServiceItemPreview({ sv }: { sv: ServiceItem }) {
  const monedasRecurrencia = monedasFromRecurrenciaPagos(sv.recurrenciaPagos)
  const t = sv.tiempo
  const vigencia =
    t.startDate && t.endDate
      ? `${t.startDate} → ${t.endDate}`
      : t.startDate
        ? `Desde ${t.startDate}`
        : '—'

  return (
    <div className="space-y-3 text-[13px]">
      <div className={sectionClass}>
        <div className={sectionTitleClass}>
          <CalendarClock size={14} aria-hidden />
          Identificación y vigencia
        </div>
        <div className="grid gap-3 min-[480px]:grid-cols-2">
          <Block label="Tipo de servicio">{sv.tipoServicio || '—'}</Block>
          <Block label="Vigencia">{vigencia}</Block>
        </div>
      </div>

      <div className={sectionClass}>
        <div className={sectionTitleClass}>
          <CalendarClock size={14} aria-hidden />
          Horarios y calendario
        </div>
        <ServiceScheduleReadView horarios={sv.horarios} />
      </div>

      <div className={sectionClass}>
        <div className={sectionTitleClass}>
          <CreditCard size={14} aria-hidden />
          Pagos recurrentes
        </div>
        <p className="text-sm font-semibold text-[var(--text)]">{formatPaymentSummary(sv)}</p>
        <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[280px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]">
                <th className="px-2 py-1.5 font-extrabold">Mes</th>
                <th className="px-2 py-1.5 font-extrabold">Día</th>
                <th className="px-2 py-1.5 font-extrabold">Moneda</th>
                <th className="px-2 py-1.5 font-extrabold">Monto</th>
              </tr>
            </thead>
            <tbody>
              {sv.recurrenciaPagos.entries.map((en, i) => (
                <tr key={i} className="border-b border-[color-mix(in_oklab,var(--border)_60%,transparent)] last:border-0">
                  <td className="px-2 py-1.5">{MES[en.month]}</td>
                  <td className="px-2 py-1.5">{en.day}</td>
                  <td className="px-2 py-1.5">{en.moneda || '—'}</td>
                  <td className="px-2 py-1.5 font-semibold">{en.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={sectionClass}>
        <div className={sectionTitleClass}>
          <ClipboardList size={14} aria-hidden />
          Alcance del servicio
        </div>
        <div className="space-y-3">
          <Block label="Descripción">{sv.descripcion || '—'}</Block>
          <Block label="Qué incluye">{sv.incluye || '—'}</Block>
          <Block label="Qué no incluye">{sv.noIncluye || '—'}</Block>
          <Block label="Qué se entrega">{sv.entregables || '—'}</Block>
        </div>
      </div>

      <div className={sectionClass}>
        <div className={sectionTitleClass}>
          <ShieldAlert size={14} aria-hidden />
          Riesgos, dependencias y condiciones
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className={sv.riesgos.enabled ? pillOn : pillOff}>Riesgos {sv.riesgos.enabled ? 'sí' : 'no'}</span>
          <span className={sv.dependencias.enabled ? pillOn : pillOff}>
            Dependencias {sv.dependencias.enabled ? 'sí' : 'no'}
          </span>
          <span className={sv.garantias.enabled ? pillOn : pillOff}>Garantías {sv.garantias.enabled ? 'sí' : 'no'}</span>
          <span className={sv.penalAtraso.enabled ? pillOn : pillOff}>
            Penal. atraso {sv.penalAtraso.enabled ? 'sí' : 'no'}
          </span>
          <span className={sv.terminacion.enabled ? pillOn : pillOff}>
            Terminación {sv.terminacion.enabled ? 'sí' : 'no'}
          </span>
        </div>
        <div className="space-y-3">
          {sv.riesgos.enabled ? (
            <Block label="Riesgos">{sv.riesgos.items.length ? sv.riesgos.items.join('\n') : '—'}</Block>
          ) : null}
          {sv.dependencias.enabled ? (
            <Block label="Dependencias">
              {sv.dependencias.items.length ? sv.dependencias.items.join('\n') : '—'}
            </Block>
          ) : null}
          {sv.garantias.enabled ? <Block label="Garantías">{sv.garantias.texto || '—'}</Block> : null}
          {sv.penalAtraso.enabled ? (
            <Block label="Penalizaciones por atraso">{sv.penalAtraso.texto || '—'}</Block>
          ) : null}
          {sv.terminacion.enabled ? (
            <>
              <Block label="Causas de terminación">
                {sv.terminacion.causas.length ? sv.terminacion.causas.join('\n') : '—'}
              </Block>
              <Block label="Aviso previo">{sv.terminacion.avisoDias || '—'}</Block>
            </>
          ) : null}
        </div>
      </div>

      <div className={sectionClass}>
        <div className={sectionTitleClass}>
          <Scale size={14} aria-hidden />
          Comercial y cumplimiento
        </div>
        <div className="grid gap-3 min-[480px]:grid-cols-2">
          <Block label="Monedas (recurrencia)">
            {monedasRecurrencia.length > 0 ? monedasRecurrencia.join(' · ') : '—'}
          </Block>
        </div>
        <div className="mt-3 space-y-3 border-t border-[var(--border)] pt-3">
          <Block label="Medición del cumplimiento">{sv.medicionCumplimiento || '—'}</Block>
          <Block label="Penalizaciones por incumplimiento">{sv.penalIncumplimiento || '—'}</Block>
          <Block label="Nivel de responsabilidad">{sv.nivelResponsabilidad || '—'}</Block>
          <Block label="Propiedad intelectual / licencias">{sv.propIntelectual || '—'}</Block>
        </div>
        <CondicionesExtrasCards fields={sv.condicionesExtras ?? []} />
      </div>
    </div>
  )
}
