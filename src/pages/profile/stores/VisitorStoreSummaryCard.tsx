import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Package,
  RefreshCw,
  Store,
  Truck,
  Wrench,
} from 'lucide-react'
import type { StoreBadge } from '../../../app/store/marketStoreTypes'
import { ProtectedMediaImg } from '../../../components/media/ProtectedMediaImg'
import type { StoreCatalog } from '../../chat/domain/storeCatalogTypes'
import { StoreTrustMini } from '../../../components/StoreTrustMini'

type Props = Readonly<{
  store: StoreBadge
  catalog: StoreCatalog | undefined
  joinedLabel: string
  onReloadCatalog?: () => void
  catalogReloadBusy?: boolean
}>

export function VisitorStoreSummaryCard({
  store: b,
  catalog: cat,
  joinedLabel: joined,
  onReloadCatalog,
  catalogReloadBusy = false,
}: Props) {
  const publishedProducts = (cat?.products ?? []).filter((p) => p.published)
  const publishedServices = (cat?.services ?? []).filter((s) => s.published !== false)

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))]">
      <Link
        to={`/store/${b.id}`}
        className="absolute inset-0 z-[1] rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        aria-label={`Abrir tienda ${b.name}`}
      />
      <div className="relative z-[2] p-3.5 pointer-events-none">
      <div className="flex w-full min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3 max-[379px]:w-full">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
            {b.avatarUrl ?
              <ProtectedMediaImg
                src={b.avatarUrl}
                alt=""
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover"
              />
            : <Store size={22} className="text-[var(--muted)]" aria-hidden />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 break-words text-base font-black tracking-[-0.02em]">
                {b.name}
              </span>
              {b.verified ?
                <span className="rounded-full bg-[color-mix(in_oklab,var(--good)_14%,transparent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-900 dark:text-emerald-300">
                  Verificado
                </span>
              : <span className="vt-badge-verify-warn-compact">
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
            <div className="mt-2 max-w-[320px]">
              <StoreTrustMini score={b.trustScore} />
            </div>
            {(() => {
              const pitchText = (cat?.pitch ?? b.pitch ?? "").trim();
              if (!pitchText) return null;
              return (
                <p className="mt-2 break-words text-[13px] leading-snug">
                  {pitchText}
                </p>
              );
            })()}
            <div className="vt-muted mt-1 text-xs">{b.categories.join(' · ')}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-[var(--border)] pt-3 min-[480px]:grid-cols-2 pointer-events-auto">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
              <Package size={12} aria-hidden /> Vitrina · productos
            </div>
            {onReloadCatalog ?
              <button
                type="button"
                className="vt-btn vt-btn-ghost vt-btn-sm inline-flex shrink-0 items-center gap-0.5 px-1.5 py-0.5"
                disabled={catalogReloadBusy}
                title="Recargar catálogo (vitrina)"
                aria-label="Recargar vitrina de productos"
                onClick={onReloadCatalog}
              >
                <RefreshCw
                  size={12}
                  className={catalogReloadBusy ? "animate-spin" : ""}
                  aria-hidden
                />
              </button>
            : null}
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
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
              <Wrench size={12} aria-hidden /> Vitrina · servicios
            </div>
            {onReloadCatalog ?
              <button
                type="button"
                className="vt-btn vt-btn-ghost vt-btn-sm inline-flex shrink-0 items-center gap-0.5 px-1.5 py-0.5"
                disabled={catalogReloadBusy}
                title="Recargar catálogo (vitrina)"
                aria-label="Recargar vitrina de servicios"
                onClick={onReloadCatalog}
              >
                <RefreshCw
                  size={12}
                  className={catalogReloadBusy ? "animate-spin" : ""}
                  aria-hidden
                />
              </button>
            : null}
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

      <p className="vt-muted mt-2 flex items-start gap-1.5 text-[11px] leading-snug pointer-events-none">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--good)]" aria-hidden />
        Toca la tarjeta para ver el catálogo y la vitrina pública de la tienda.
      </p>
      </div>
    </div>
  )
}
