import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../../app/store/useAppStore'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Film,
  LayoutGrid,
  Package,
  Rss,
  Store,
  Truck,
  Wrench,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useMarketStore } from '../../app/store/useMarketStore'
import type { StoreBadge } from '../../app/store/marketStoreTypes'
import type { StoreCatalog, StoreProduct, StoreService } from '../chat/domain/storeCatalogTypes'
import { reelsForStore } from '../../utils/reels/reelsBootstrapState'
import { fetchStoreDetail } from '../../utils/market/fetchStoreDetail'

type StoreScreen = 'hub' | 'catalog' | 'products' | 'services' | 'feed' | 'reels'

const backRowBtnClass =
  'vt-btn z-[2] shrink-0 border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.72)] shadow-[0_10px_25px_rgba(2,6,23,0.18)] backdrop-blur-[10px] hover:bg-[rgba(255,255,255,0.86)]'

function ProductDetailCard({ p }: { p: StoreProduct }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="grid min-[640px]:grid-cols-[160px_1fr]">
        <div className="relative min-h-[120px] bg-[color-mix(in_oklab,var(--bg)_75%,var(--surface))]">
          {p.photoUrls[0] ? (
            <img src={p.photoUrls[0]} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="grid h-full min-h-[120px] place-items-center text-[var(--muted)]">
              <Package size={28} aria-hidden />
            </div>
          )}
        </div>
        <div className="p-3.5">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">{p.category}</div>
          <div className="mt-1 text-base font-black tracking-[-0.02em]">
            {p.name}
            {p.model ? <span className="font-bold text-[var(--muted)]"> · {p.model}</span> : null}
          </div>
          <div className="mt-2 text-sm font-bold text-[color-mix(in_oklab,var(--primary)_90%,var(--text))]">{p.price}</div>
          {p.photoUrls.length > 1 ? (
            <div className="mt-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Más fotos</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {p.photoUrls.slice(1).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-[var(--border)]">
                    <img src={url} alt="" className="h-16 w-16 object-cover sm:h-20 sm:w-20" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
          <dl className="mt-3 space-y-2 text-[13px] leading-snug">
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Descripción breve</dt>
              <dd>{p.shortDescription}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Beneficio principal</dt>
              <dd>{p.mainBenefit}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Características técnicas</dt>
              <dd className="whitespace-pre-wrap">{p.technicalSpecs}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Estado</dt>
              <dd className="capitalize">{p.condition}</dd>
            </div>
            {p.taxesShippingInstall ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Impuestos / envío / instalación</dt>
                <dd>{p.taxesShippingInstall}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Disponibilidad</dt>
              <dd>{p.availability}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Garantía y devolución</dt>
              <dd className="whitespace-pre-wrap">{p.warrantyReturn}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Contenido incluido</dt>
              <dd className="whitespace-pre-wrap">{p.contentIncluded}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Condiciones de uso</dt>
              <dd className="whitespace-pre-wrap">{p.usageConditions}</dd>
            </div>
            {p.customFields.length > 0 ? (
              <div className="border-t border-[var(--border)] pt-2">
                <dt className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Otros campos</dt>
                {p.customFields.map((f, i) => (
                  <dd key={i} className="mb-3 last:mb-0">
                    <span className="font-bold">{f.title}</span>
                    {f.body ? <p className="mt-0.5 whitespace-pre-wrap leading-snug">{f.body}</p> : null}
                    {f.attachmentNote ? (
                      <p className="vt-muted mt-0.5 text-[12px]">{f.attachmentNote}</p>
                    ) : null}
                    {f.attachments && f.attachments.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {f.attachments.map((att) =>
                          att.kind === 'image' ? (
                            <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="block">
                              <img src={att.url} alt={att.fileName} className="max-h-32 max-w-[160px] rounded border border-[var(--border)] object-contain" />
                            </a>
                          ) : (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[12px] font-semibold text-[var(--primary)]"
                            >
                              {att.fileName}
                            </a>
                          ),
                        )}
                      </div>
                    ) : null}
                  </dd>
                ))}
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  )
}

function ServiceDetailCard({ s }: { s: StoreService }) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div className="flex items-start gap-2">
        <Wrench size={20} className="mt-0.5 shrink-0 text-[var(--muted)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">{s.category}</div>
          <div className="mt-1 font-black tracking-[-0.02em]">{s.tipoServicio}</div>
          <p className="vt-muted mt-2 text-[13px] leading-snug">{s.descripcion}</p>
          <dl className="mt-3 space-y-2 text-[13px] leading-snug">
            {s.riesgos.enabled && s.riesgos.items.length > 0 ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Riesgos</dt>
                <dd>
                  <ul className="m-0 list-disc pl-4">
                    {s.riesgos.items.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Qué incluye</dt>
              <dd className="whitespace-pre-wrap">{s.incluye}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Qué no incluye</dt>
              <dd className="whitespace-pre-wrap">{s.noIncluye}</dd>
            </div>
            {s.dependencias.enabled && s.dependencias.items.length > 0 ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Dependencias</dt>
                <dd>
                  <ul className="m-0 list-disc pl-4">
                    {s.dependencias.items.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Qué se entrega</dt>
              <dd className="whitespace-pre-wrap">{s.entregables}</dd>
            </div>
            {s.garantias.enabled ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Garantías</dt>
                <dd className="whitespace-pre-wrap">{s.garantias.texto}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Propiedad intelectual</dt>
              <dd className="whitespace-pre-wrap">{s.propIntelectual}</dd>
            </div>
            {s.customFields.length > 0 ? (
              <div className="border-t border-[var(--border)] pt-2">
                <dt className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Otros campos</dt>
                {s.customFields.map((f, i) => (
                  <dd key={i} className="mb-3 last:mb-0">
                    <span className="font-bold">{f.title}</span>
                    {f.body ? <p className="mt-0.5 whitespace-pre-wrap leading-snug">{f.body}</p> : null}
                    {f.attachmentNote ? (
                      <p className="vt-muted mt-0.5 text-[12px]">{f.attachmentNote}</p>
                    ) : null}
                    {f.attachments && f.attachments.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {f.attachments.map((att) =>
                          att.kind === 'image' ? (
                            <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="block">
                              <img src={att.url} alt={att.fileName} className="max-h-32 max-w-[160px] rounded border border-[var(--border)] object-contain" />
                            </a>
                          ) : (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,var(--surface))] px-2 py-1 text-[12px] font-semibold text-[var(--primary)]"
                            >
                              {att.fileName}
                            </a>
                          ),
                        )}
                      </div>
                    ) : null}
                  </dd>
                ))}
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  )
}

function StoreIdentityBlock({
  store,
  catalog,
  joinedLabel,
}: {
  store: StoreBadge
  catalog: StoreCatalog | undefined
  joinedLabel: string | null
}) {
  return (
    <div className="vt-card vt-card-pad">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {store.avatarUrl ? (
            <img
              src={store.avatarUrl}
              alt=""
              className="mt-0.5 h-14 w-14 shrink-0 rounded-[16px] border border-[var(--border)] object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <div className="text-[22px] font-black tracking-[-0.03em]">{store.name}</div>
            <div className="vt-muted mt-1">{store.categories.join(' · ')}</div>
            {catalog?.pitch ? (
              <p className="mt-2 max-w-[720px] text-[13px] leading-snug text-[var(--text)]">{catalog.pitch}</p>
            ) : null}
            {joinedLabel ? (
              <div className="vt-muted mt-2 inline-flex items-center gap-2 text-xs font-bold">
                <Calendar size={14} aria-hidden /> En la plataforma desde {joinedLabel}
              </div>
            ) : null}
          </div>
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
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-2.5 py-2 text-xs font-black',
            store.transportIncluded
              ? 'border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))]'
              : 'border-[color-mix(in_oklab,#d97706_40%,var(--border))] bg-[color-mix(in_oklab,#d97706_14%,var(--surface))] text-[var(--text)]',
          )}
        >
          <Truck size={16} /> Transporte {store.transportIncluded ? 'incluido' : 'NO incluido'}
        </span>
        {!store.transportIncluded ? (
          <span className="vt-muted text-[13px]">
            Etiqueta explícita para evitar dudas en el chat: el transporte no forma parte de la oferta salvo que se negocie en el acuerdo.
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function StorePage() {
  const { storeId } = useParams()
  const nav = useNavigate()
  const me = useAppStore((s) => s.me)
  const store = useMarketStore((s) => (storeId ? s.stores[storeId] : undefined))
  const catalog = useMarketStore((s) => (storeId ? s.storeCatalogs[storeId] : undefined))
  const offers = useMarketStore((s) => s.offers)
  const offerIds = useMarketStore((s) => s.offerIds)

  const [screen, setScreen] = useState<StoreScreen>('hub')
  const [detailStatus, setDetailStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadNonce, setLoadNonce] = useState(0)

  useEffect(() => {
    setScreen('hub')
  }, [storeId])

  useEffect(() => {
    if (!storeId) return
    if (!useMarketStore.getState().stores[storeId]) return
    let cancelled = false
    setDetailStatus('loading')
    void (async () => {
      try {
        const data = await fetchStoreDetail(storeId, { userId: me.id })
        if (cancelled) return
        useMarketStore.setState((s) => ({
          stores: { ...s.stores, [storeId]: data.store },
          storeCatalogs: { ...s.storeCatalogs, [storeId]: data.catalog },
        }))
        setDetailStatus('ready')
      } catch {
        if (!cancelled) setDetailStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [storeId, me.id, loadNonce])

  if (!storeId || !store) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Tienda no encontrada.</div>
      </div>
    )
  }

  if (detailStatus === 'loading') {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad flex flex-col items-center justify-center gap-2 py-20 text-center">
          <div className="text-lg font-black tracking-[-0.02em]">Cargando tienda…</div>
          <div className="max-w-[360px] text-sm text-[var(--muted)]">
            Obteniendo catálogo y datos públicos según tu perfil.
          </div>
        </div>
      </div>
    )
  }

  if (detailStatus === 'error') {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad flex flex-col items-center gap-4 py-16 text-center">
          <div className="font-bold">No se pudieron cargar los datos de la tienda.</div>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={() => setLoadNonce((n) => n + 1)}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const storeOffers = offerIds.map((id) => offers[id]).filter((o) => o && o.storeId === storeId)

  const publishedProducts = (catalog?.products ?? []).filter((p) => p.published)
  const publishedServices = (catalog?.services ?? []).filter((s) => s.published !== false)
  const storeReels = reelsForStore(storeId)

  const joinedLabel = catalog
    ? new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' }).format(catalog.joinedAt)
    : null

  function goBack() {
    if (screen === 'hub') {
      nav(-1)
      return
    }
    if (screen === 'products' || screen === 'services') {
      setScreen('catalog')
      return
    }
    setScreen('hub')
  }

  const headerTitle =
    screen === 'hub'
      ? store.name
      : screen === 'catalog'
        ? 'Catálogo'
        : screen === 'products'
          ? 'Productos'
          : screen === 'services'
            ? 'Servicios'
            : screen === 'feed'
              ? 'Publicaciones en el feed'
              : 'Reels'

  const hubStoreTile = (
    <button
      type="button"
      onClick={() => setScreen('catalog')}
      className={cn(
        'flex min-w-[min(100%,280px)] shrink-0 snap-start items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left transition-colors',
        'hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))]',
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_60%,var(--surface))]">
        {store.avatarUrl ? (
          <img src={store.avatarUrl} alt="" className="h-full w-full rounded-[10px] object-cover" />
        ) : (
          <Store size={22} className="text-[var(--muted)]" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Tienda</div>
        <div className="truncate font-black tracking-[-0.02em]">{store.name}</div>
        <div className="vt-muted mt-0.5 truncate text-[12px]">Catálogo: productos y servicios</div>
      </div>
      <ChevronRight size={20} className="shrink-0 text-[var(--muted)]" aria-hidden />
    </button>
  )

  const catalogProductTile = (
    <button
      type="button"
      onClick={() => setScreen('products')}
      className={cn(
        'flex min-w-[min(100%,240px)] flex-1 snap-start flex-col gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors',
        'hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]">
          <Package size={20} className="text-[var(--primary)]" aria-hidden />
        </span>
        <ChevronRight size={18} className="shrink-0 text-[var(--muted)]" aria-hidden />
      </div>
      <div>
        <div className="font-black tracking-[-0.02em]">Productos</div>
        <div className="vt-muted mt-1 text-[12px] leading-snug">
          {publishedProducts.length} publicado{publishedProducts.length === 1 ? '' : 's'} en vitrina
        </div>
      </div>
    </button>
  )

  const catalogServiceTile = (
    <button
      type="button"
      onClick={() => setScreen('services')}
      className={cn(
        'flex min-w-[min(100%,240px)] flex-1 snap-start flex-col gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors',
        'hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]">
          <Wrench size={20} className="text-[var(--primary)]" aria-hidden />
        </span>
        <ChevronRight size={18} className="shrink-0 text-[var(--muted)]" aria-hidden />
      </div>
      <div>
        <div className="font-black tracking-[-0.02em]">Servicios</div>
        <div className="vt-muted mt-1 text-[12px] leading-snug">
          {publishedServices.length} publicado{publishedServices.length === 1 ? '' : 's'} en vitrina
        </div>
      </div>
    </button>
  )

  const feedSectionEntry = (
    <button
      type="button"
      onClick={() => setScreen('feed')}
      className={cn(
        'flex w-full items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left transition-colors',
        'hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))]',
      )}
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]">
        <Rss size={22} className="text-[var(--primary)]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Feed de la plataforma</div>
        <div className="font-black tracking-[-0.02em]">Publicaciones</div>
        <div className="vt-muted mt-0.5 text-[12px]">
          Ofertas y avisos de esta tienda ({storeOffers.length})
        </div>
      </div>
      <ChevronRight size={20} className="shrink-0 text-[var(--muted)]" aria-hidden />
    </button>
  )

  const reelsSectionEntry = (
    <button
      type="button"
      onClick={() => setScreen('reels')}
      className={cn(
        'flex w-full items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left transition-colors',
        'hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))]',
      )}
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]">
        <Film size={22} className="text-[var(--primary)]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Contenido audiovisual</div>
        <div className="font-black tracking-[-0.02em]">Reels</div>
        <div className="vt-muted mt-0.5 text-[12px]">
          {storeReels.length
            ? `${storeReels.length} reel${storeReels.length === 1 ? '' : 's'} · abrí para ver en pantalla completa`
            : 'Videos cortos del negocio'}
        </div>
      </div>
      <ChevronRight size={20} className="shrink-0 text-[var(--muted)]" aria-hidden />
    </button>
  )

  return (
    <div className="container vt-page">
      <div className="flex flex-col gap-3.5">
        <div className="vt-card vt-card-pad">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={backRowBtnClass}
              onClick={goBack}
              aria-label={screen === 'hub' ? 'Volver' : 'Atrás'}
              style={{
                minWidth: 40,
                minHeight: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="min-w-0 truncate text-lg font-black tracking-[-0.03em]">{headerTitle}</h1>
          </div>
        </div>

        {screen === 'hub' ? (
          <>
            <StoreIdentityBlock store={store} catalog={catalog} joinedLabel={joinedLabel} />
            <div className="vt-card vt-card-pad">
              <div className="mb-2 flex items-center gap-2">
                <LayoutGrid size={18} className="text-[var(--muted)]" aria-hidden />
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Explorar</span>
              </div>
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {hubStoreTile}
              </div>
            </div>

            <div className="vt-card vt-card-pad flex flex-col gap-4">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Vitrina pública</div>
                <p className="vt-muted mt-1 max-w-[720px] text-[13px] leading-snug">
                  Productos y servicios publicados, y reels de la tienda — la misma información que en la vista previa del
                  dueño, sin opciones de edición.
                </p>
              </div>

              {publishedProducts.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Productos</span>
                    <button type="button" className="vt-btn vt-btn-ghost vt-btn-sm" onClick={() => setScreen('products')}>
                      Ver todos
                    </button>
                  </div>
                  <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {publishedProducts.slice(0, 14).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setScreen('products')}
                        className="flex w-[148px] shrink-0 snap-start flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface)] text-left transition-colors hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]"
                      >
                        <div className="relative h-[88px] bg-[color-mix(in_oklab,var(--bg)_75%,var(--surface))]">
                          {p.photoUrls[0] ? (
                            <img src={p.photoUrls[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center text-[var(--muted)]">
                              <Package size={22} aria-hidden />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="line-clamp-2 text-[12px] font-bold leading-snug">{p.name}</div>
                          <div className="vt-muted mt-0.5 truncate text-[11px] font-semibold">{p.price}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {publishedServices.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Servicios</span>
                    <button type="button" className="vt-btn vt-btn-ghost vt-btn-sm" onClick={() => setScreen('services')}>
                      Ver todos
                    </button>
                  </div>
                  <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {publishedServices.slice(0, 14).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setScreen('services')}
                        className="min-w-[min(100%,200px)] shrink-0 snap-start rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2 text-left transition-colors hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]"
                      >
                        <div className="flex items-start gap-2">
                          <Wrench size={16} className="mt-0.5 shrink-0 text-[var(--muted)]" aria-hidden />
                          <span className="min-w-0">
                            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                              {s.category}
                            </span>
                            <span className="mt-0.5 block text-[13px] font-bold leading-snug">{s.tipoServicio}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {storeReels.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Reels</span>
                    <Link to={`/reels?store=${encodeURIComponent(storeId)}`} className="vt-btn vt-btn-ghost vt-btn-sm no-underline">
                      Pantalla completa
                    </Link>
                  </div>
                  <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {storeReels.map((r) => (
                      <Link
                        key={r.id}
                        to={`/reels?store=${encodeURIComponent(storeId)}&reel=${encodeURIComponent(r.id)}`}
                        className="group relative h-[124px] w-[88px] shrink-0 snap-start overflow-hidden rounded-[12px] border border-[var(--border)] no-underline"
                      >
                        <img src={r.cover} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(2,6,23,0.85)] via-transparent to-transparent" />
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 z-[1]">
                          <div className="line-clamp-2 text-[10px] font-extrabold leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
                            {r.title}
                          </div>
                        </div>
                        <span className="absolute right-1 top-1 z-[1] grid h-7 w-7 place-items-center rounded-full border border-white/30 bg-[rgba(2,6,23,0.45)] text-white backdrop-blur-[6px]">
                          <Film size={14} aria-hidden />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {publishedProducts.length === 0 && publishedServices.length === 0 && storeReels.length === 0 ? (
                <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                  Esta tienda aún no tiene contenido publicado en vitrina.
                </p>
              ) : null}
            </div>

            <div className="vt-card vt-card-pad flex flex-col gap-2.5">
              {feedSectionEntry}
              {reelsSectionEntry}
            </div>
          </>
        ) : null}

        {screen === 'catalog' ? (
          <>
            <StoreIdentityBlock store={store} catalog={catalog} joinedLabel={joinedLabel} />
            <div className="vt-card vt-card-pad">
              <div className="vt-h2">Catálogo de la tienda</div>
              <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                Elegí productos (fichas publicadas en vitrina) o servicios publicados en vitrina.
              </p>
              <div className="vt-divider my-3" />
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[560px]:flex-nowrap min-[560px]:overflow-visible">
                {catalogProductTile}
                {catalogServiceTile}
              </div>
            </div>
          </>
        ) : null}

        {screen === 'products' ? (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Todos los productos</div>
            <p className="vt-muted mt-1.5 text-[13px] leading-snug">
              Solo se listan productos publicados en la vitrina.
            </p>
            <div className="vt-divider my-3" />
            {publishedProducts.length ? (
              <div className="flex flex-col gap-3">
                {publishedProducts.map((p) => (
                  <ProductDetailCard key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                No hay productos publicados en la vitrina.
              </p>
            )}
          </div>
        ) : null}

        {screen === 'services' ? (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Todos los servicios</div>
            <p className="vt-muted mt-1.5 text-[13px] leading-snug">Solo se listan servicios publicados en la vitrina.</p>
            <div className="vt-divider my-3" />
            {publishedServices.length ? (
              <div className="flex flex-col gap-3">
                {publishedServices.map((s) => (
                  <ServiceDetailCard key={s.id} s={s} />
                ))}
              </div>
            ) : (
              <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                No hay servicios publicados en la vitrina.
              </p>
            )}
          </div>
        ) : null}

        {screen === 'feed' ? (
          <div className="vt-card vt-card-pad">
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Feed de la plataforma</div>
            <div className="vt-h2">Publicaciones de esta tienda</div>
            <p className="vt-muted mt-1.5 text-[13px] leading-snug">
              Ofertas y avisos publicados en el feed general (no son el catálogo de fichas).
            </p>
            <div className="vt-divider my-3" />
            {storeOffers.length ? (
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
            ) : (
              <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                No hay publicaciones en el feed para esta tienda.
              </p>
            )}
          </div>
        ) : null}

        {screen === 'reels' ? (
          <div className="vt-card vt-card-pad">
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">Contenido audiovisual</div>
            <div className="vt-h2">Reels de {store.name}</div>
            <p className="vt-muted mt-1.5 text-[13px] leading-snug">
              Mismo contenido que en la vista de reels filtrada por tienda; tocá una tarjeta para abrirlo vertical a pantalla completa.
            </p>
            <div className="vt-divider my-3" />
            {storeReels.length ? (
              <div className="grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 min-[900px]:grid-cols-4">
                {storeReels.map((r) => (
                  <Link
                    key={r.id}
                    to={`/reels?store=${encodeURIComponent(storeId)}&reel=${encodeURIComponent(r.id)}`}
                    className="group overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] no-underline"
                  >
                    <div className="relative aspect-[9/14] bg-[color-mix(in_oklab,var(--bg)_65%,var(--surface))]">
                      <img
                        src={r.cover}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(2,6,23,0.82)] via-transparent to-transparent" />
                      <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-[rgba(2,6,23,0.4)] text-white backdrop-blur-[8px]">
                        <Film size={16} aria-hidden />
                      </span>
                      <div className="absolute bottom-2 left-2 right-2 z-[1]">
                        <div className="line-clamp-2 text-[12px] font-extrabold leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
                          {r.title}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-white/85">{r.category}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                Esta tienda aún no tiene reels en la demo.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
