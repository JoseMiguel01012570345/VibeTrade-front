import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMarketStore } from '../../app/store/useMarketStore'

export function HomePage() {
  const offerIds = useMarketStore((s) => s.offerIds)
  const offers = useMarketStore((s) => s.offers)
  const stores = useMarketStore((s) => s.stores)

  const items = useMemo(() => offerIds.map((id) => offers[id]).filter(Boolean), [offerIds, offers])

  return (
    <div className="container vt-page">
      <div className="mb-3 mt-2 flex items-center justify-between">
        <div>
          <h1 className="vt-h1">Ofertas</h1>
          <div className="vt-muted">Scroll con ofertas afines a tus intereses (demo).</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3.5">
        {items.map((o) => {
          const store = stores[o.storeId]
          return (
            <div key={o.id} className="vt-card col-span-12 overflow-hidden min-[860px]:col-span-6">
              <Link to={`/offer/${o.id}`} className="group block h-[190px] overflow-hidden bg-gray-200">
                <img
                  src={o.imageUrl}
                  alt={o.title}
                  className="block h-full w-full scale-[1.02] object-cover transition-transform duration-[240ms] ease-out group-hover:scale-[1.06]"
                />
              </Link>

              <div className="flex flex-col gap-2.5 p-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-black tracking-[-0.02em]">
                    <Link to={`/offer/${o.id}`}>{o.title}</Link>
                  </div>
                  <div className="shrink-0 font-black text-[var(--text)]">{o.price}</div>
                </div>

                <div className="flex items-center justify-between gap-2.5">
                  <div className="vt-muted">{o.location}</div>
                  <Link
                    to={`/store/${store.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2.5 py-1.5 text-xs font-extrabold text-[var(--text)]"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                    {store.name}
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2">
                  {o.tags.map((t) => (
                    <span key={t} className="vt-pill">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
