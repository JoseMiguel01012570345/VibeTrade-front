import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Package,
  Store,
  Truck,
  Wrench,
} from 'lucide-react'
import type { StoreBadge } from '../../../app/store/marketStoreTypes'
import type { StoreCatalog } from '../../chat/domain/storeCatalogTypes'

type Props = Readonly<{
  store: StoreBadge
  catalog: StoreCatalog | undefined
  joinedLabel: string
}>

export function VisitorStoreSummaryCard({ store: b, catalog: cat, joinedLabel: joined }: Props) {
  const publishedProducts = (cat?.products ?? []).filter((p) => p.published)
  const publishedServices = (cat?.services ?? []).filter((s) => s.published !== false)

  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
            {b.avatarUrl ?
              <img src={b.avatarUrl} alt="" className="h-full w-full object-cover" />
            : <Store size={22} className="text-[var(--muted)]" aria-hidden />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black tracking-[-0.02em]">{b.name}</span>
              {b.verified ?
                <span className="rounded-full bg-[color-mix(in_oklab,var(--good)_14%,transparent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-900">
                  Verificado
                </span>
              : <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,#d97706_16%,transparent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-950">
                  <AlertTriangle size={12} aria-hidden /> No verificado
                </span>}
            </div>
            <div className="vt-muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} aria-hidden /> Alta: {joined}
              </span>
              <span className="inline-flex items-center gap-1">
                <Truck size={12} aria-hidden /> Transporte:{' '}
                {b.transportIncluded ? 'incluido' : 'no incluido'}
              </span>
            </div>
            {cat?.pitch ?
              <p className="mt-2 text-[13px] leading-snug">{cat.pitch}</p>
            : null}
            <div className="vt-muted mt-1 text-xs">{b.categories.join(' · ')}</div>
          </div>
        </div>
        <Link className="vt-btn vt-btn-sm no-underline shrink-0" to={`/store/${b.id}`}>
          Ver tienda
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-[var(--border)] pt-3 min-[480px]:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            <Package size={12} aria-hidden /> Vitrina · productos
          </div>
          <div className="mt-1 text-sm font-bold">{publishedProducts.length} publicado{publishedProducts.length === 1 ? '' : 's'}</div>
          {publishedProducts.length > 0 ?
            <ul className="vt-muted mt-1.5 space-y-0.5 text-[12px] leading-snug">
              {publishedProducts.slice(0, 4).map((p) => (
                <li key={p.id} className="truncate">
                  {p.name}
                </li>
              ))}
              {publishedProducts.length > 4 ?
                <li className="text-[11px] font-semibold">+{publishedProducts.length - 4} más…</li>
              : null}
            </ul>
          : <p className="vt-muted mt-1 text-[12px]">Sin productos en vitrina.</p>}
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            <Wrench size={12} aria-hidden /> Vitrina · servicios
          </div>
          <div className="mt-1 text-sm font-bold">{publishedServices.length} publicado{publishedServices.length === 1 ? '' : 's'}</div>
          {publishedServices.length > 0 ?
            <ul className="vt-muted mt-1.5 space-y-0.5 text-[12px] leading-snug">
              {publishedServices.slice(0, 4).map((s) => (
                <li key={s.id} className="truncate">
                  {s.tipoServicio}
                </li>
              ))}
              {publishedServices.length > 4 ?
                <li className="text-[11px] font-semibold">+{publishedServices.length - 4} más…</li>
              : null}
            </ul>
          : <p className="vt-muted mt-1 text-[12px]">Sin servicios en vitrina.</p>}
        </div>
      </div>

      <p className="vt-muted mt-2 flex items-start gap-1.5 text-[11px] leading-snug">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--good)]" aria-hidden />
        La ficha completa (catálogo, feed y reels) está en la vista pública de la tienda.
      </p>
    </div>
  )
}
