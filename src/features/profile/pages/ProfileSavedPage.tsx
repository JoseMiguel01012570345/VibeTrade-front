import { Link } from 'react-router-dom'
import { cn } from '@shared/lib/cn'
import type { Offer, StoreBadge, RouteOfferPublicState } from '@features/market/logic/store/marketStoreTypes'
import {
  isToolPlaceholderUrl,
  TOOL_PLACEHOLDER_SRC,
} from '@features/market/logic/toolPlaceholder'
import { buildEmergentMapLegs } from '@features/market/logic/map/emergentRouteMapLegs'
import { storeProductHref } from '@features/market/logic/store/storePath'
import { EmergentRouteFeedMap } from '@features/home'
import { ProtectedMediaImg } from '@shared/components/media/ProtectedMediaImg'

type Props = {
  savedOfferItems: Offer[]
  stores: Record<string, StoreBadge>
  routeOfferPublic: Record<string, RouteOfferPublicState>
}

export function ProfileSavedPage({
  savedOfferItems,
  stores,
  routeOfferPublic,
}: Props) {
  return (
    <div className="vt-card vt-card-pad">
      <div className="vt-h2">Ofertas guardadas</div>
      <div className="vt-muted mt-1.5">
        Toca una tarjeta para abrir la oferta. Puedes guardar desde el ícono de
        marcador en el listado o en el detalle.
      </div>
      <div className="vt-divider my-3" />
      {savedOfferItems.length === 0 ? (
        <div className="vt-muted">Aún no guardaste ofertas.</div>
      ) : (
        <div className="grid grid-cols-12 gap-3.5">
          {savedOfferItems.map((o, idx) => {
            const store = stores[o.storeId]
            const routePreview =
              routeOfferPublic[o.id] ??
              (o.emergentBaseOfferId?.trim()
                ? routeOfferPublic[o.emergentBaseOfferId.trim()]
                : undefined)
            const isEmergentRouteCard =
              o.isEmergentRoutePublication === true ||
              (o.tags?.includes('Hoja de ruta (publicada)') && !!routePreview)
            /** Producto/servicio → `{base}/{nombre}/{id}`; ruta emergente → `/offer/:id`. */
            const offerHref = isEmergentRouteCard
              ? `/offer/${o.id}`
              : storeProductHref(store ?? { id: o.storeId, name: '' }, o.id)
            const mapLegs = buildEmergentMapLegs(o, routePreview)
            const thumbSrc =
              o.imageUrl?.trim() ||
              (o.tags.includes('Servicio')
                ? TOOL_PLACEHOLDER_SRC
                : undefined)
            const isToolPlaceholder = isToolPlaceholderUrl(thumbSrc)
            return (
              <Link
                key={o.id}
                to={offerHref}
                className={cn(
                  'vt-card col-span-12 overflow-hidden min-[640px]:col-span-6 no-underline text-[var(--text)]',
                  isEmergentRouteCard ? 'group' : !isToolPlaceholder && 'group',
                )}
              >
                <div className="relative h-[160px] overflow-hidden bg-gray-200">
                  {isEmergentRouteCard ? (
                    <div
                      className={cn(
                        'flex h-full min-h-[160px] w-full flex-col overflow-hidden transition-transform duration-[240ms] ease-out will-change-transform',
                        'group-hover:scale-[1.03]',
                      )}
                    >
                      <div className="shrink-0 border-b border-slate-200/80 bg-[#eef2f7] py-1.5 text-center text-[11px] font-black tracking-wide text-slate-800">
                        Hoja de ruta
                      </div>
                      <EmergentRouteFeedMap
                        legs={mapLegs}
                        mapKey={`saved-map-${o.id}-${idx}`}
                        className="relative z-0 min-h-0 flex-1 overflow-hidden bg-[#e2e8f0] [&_.leaflet-control-attribution]:text-[7px] [&_.leaflet-control-attribution]:opacity-80"
                      />
                    </div>
                  ) : (
                    <ProtectedMediaImg
                      src={thumbSrc}
                      alt={o.title}
                      wrapperClassName="block h-full w-full min-h-[160px]"
                      className={cn(
                        'block h-full w-full min-h-[160px] transition-transform duration-[240ms] ease-out',
                        isToolPlaceholder
                          ? 'vt-img-tool-placeholder p-3 sm:p-4'
                          : 'object-cover group-hover:scale-[1.04]',
                      )}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2 p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-black tracking-[-0.02em]">
                      {o.title}
                    </div>
                    <div className="shrink-0 font-black text-[var(--text)]">
                      {o.price}
                    </div>
                  </div>
                  {store ? (
                    <div className="text-xs font-extrabold text-[var(--muted)]">
                      {store.name}
                    </div>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
