import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Truck } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useMarketStore } from '../../app/store/useMarketStore'

export function StorePage() {
  const { storeId } = useParams()
  const nav = useNavigate()
  const store = useMarketStore((s) => (storeId ? s.stores[storeId] : undefined))
  const offers = useMarketStore((s) => s.offers)
  const offerIds = useMarketStore((s) => s.offerIds)

  if (!storeId || !store) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Tienda no encontrada.</div>
      </div>
    )
  }

  const storeOffers = offerIds.map((id) => offers[id]).filter((o) => o && o.storeId === storeId)

  return (
    <div className="container vt-page">
      <div className="flex flex-col gap-3.5">
        <div className="vt-card vt-card-pad">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[22px] font-black tracking-[-0.03em]">{store.name}</div>
              <div className="vt-muted">{store.categories.join(' · ')}</div>
            </div>
            <div>
              {store.verified ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-2.5 py-2 text-xs font-black',
                    'bg-[color-mix(in_oklab,var(--good)_12%,transparent)] text-[color-mix(in_oklab,var(--good)_85%,var(--text))]',
                  )}
                >
                  <CheckCircle2 size={16} /> Verificado
                </span>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-2.5 py-2 text-xs font-black',
                    'bg-[color-mix(in_oklab,var(--bad)_10%,transparent)] text-[color-mix(in_oklab,var(--bad)_80%,var(--text))]',
                  )}
                >
                  <AlertTriangle size={16} /> No verificado
                </span>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2.5 py-2 text-xs font-black">
              <Truck size={16} /> Transporte {store.transportIncluded ? 'incluido' : 'NO incluido'}
            </span>
            {!store.transportIncluded && (
              <span className="vt-muted">En el chat se indica si el transporte está incluido o no.</span>
            )}
          </div>
        </div>

        <div className="vt-card vt-card-pad">
          <div className="vt-h2">Catálogo</div>
          <div className="vt-divider my-3" />
          <div className="grid grid-cols-12 gap-3">
            {storeOffers.map((o) => (
              <Link
                key={o.id}
                to={`/offer/${o.id}`}
                className="col-span-12 grid min-[720px]:col-span-6 grid-cols-[120px_1fr] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]"
              >
                <img src={o.imageUrl} alt={o.title} className="block h-full min-h-[90px] w-[120px] object-cover" />
                <div className="px-3 py-2.5">
                  <div className="font-black tracking-[-0.02em]">{o.title}</div>
                  <div className="vt-muted">{o.price}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="vt-card vt-card-pad">
          <div className="vt-h2">Contenido (Reels / Posts)</div>
          <div className="vt-muted mt-1.5">
            Placeholder: aquí se mostraría contenido creado por el negocio en la plataforma.
          </div>
        </div>

        <button className="vt-btn" onClick={() => nav(-1)}>
          Volver
        </button>
      </div>
    </div>
  )
}
