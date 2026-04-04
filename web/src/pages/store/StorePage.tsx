import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Calendar, CheckCircle2, Package, Truck, Wrench } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useMarketStore } from '../../app/store/useMarketStore'
import type { StoreProduct, StoreService } from '../chat/domain/storeCatalogTypes'

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

export function StorePage() {
  const { storeId } = useParams()
  const nav = useNavigate()
  const store = useMarketStore((s) => (storeId ? s.stores[storeId] : undefined))
  const catalog = useMarketStore((s) => (storeId ? s.storeCatalogs[storeId] : undefined))
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

  const publishedProducts = (catalog?.products ?? []).filter((p) => p.published)

  const joinedLabel = catalog
    ? new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' }).format(catalog.joinedAt)
    : null

  return (
    <div className="container vt-page">
      <div className="flex flex-col gap-3.5">
        <div className="vt-card vt-card-pad">
          <div className="flex items-start justify-between gap-3">
            <div>
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
                Etiqueta explícita para evitar dudas en el chat: el transporte no forma parte de la oferta salvo que se negocie en el
                acuerdo.
              </span>
            ) : null}
          </div>
        </div>

        {publishedProducts.length ? (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Productos (catálogo de tienda)</div>
            <p className="vt-muted mt-1.5 text-[13px] leading-snug">
              Fichas con el detalle que el negocio configuró (categoría, descripción, beneficio, técnica, estado, precio, disponibilidad,
              garantías, fotos y campos libres). Solo se muestran productos que el negocio publicó en la vitrina.
            </p>
            <div className="vt-divider my-3" />
            <div className="flex flex-col gap-3">
              {publishedProducts.map((p) => (
                <ProductDetailCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        ) : null}

        {catalog?.services.length ? (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Servicios (catálogo de tienda)</div>
            <p className="vt-muted mt-1.5 text-[13px] leading-snug">
              Tipo, descripción, riesgos, alcances, dependencias, entregables, garantías y propiedad intelectual, alineados al perfil de
              negocio.
            </p>
            <div className="vt-divider my-3" />
            <div className="flex flex-col gap-3">
              {catalog.services.map((s) => (
                <ServiceDetailCard key={s.id} s={s} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="vt-card vt-card-pad">
          <div className="vt-h2">Publicaciones en el feed</div>
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
