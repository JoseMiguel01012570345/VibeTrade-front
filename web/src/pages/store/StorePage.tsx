import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Truck } from 'lucide-react'
import { useMarketStore } from '../../app/store/useMarketStore'
import './store.css'

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
      <div className="vt-storepage">
        <div className="vt-card vt-card-pad vt-storehead">
          <div className="vt-storehead-top">
            <div>
              <div className="vt-store-name">{store.name}</div>
              <div className="vt-muted">{store.categories.join(' · ')}</div>
            </div>
            <div className="vt-store-verify">
              {store.verified ? (
                <span className="vt-store-badge2 vt-store-badge2-ok">
                  <CheckCircle2 size={16} /> Verificado
                </span>
              ) : (
                <span className="vt-store-badge2 vt-store-badge2-no">
                  <AlertTriangle size={16} /> No verificado
                </span>
              )}
            </div>
          </div>

          <div className="vt-store-transport">
            <span className="vt-store-badge2">
              <Truck size={16} /> Transporte {store.transportIncluded ? 'incluido' : 'NO incluido'}
            </span>
            {!store.transportIncluded && (
              <span className="vt-muted">Se mostrará warning en el chat para habilitar “Añadir Transportista”.</span>
            )}
          </div>
        </div>

        <div className="vt-card vt-card-pad">
          <div className="vt-h2">Catálogo</div>
          <div className="vt-divider" style={{ margin: '12px 0' }} />
          <div className="vt-storegrid">
            {storeOffers.map((o) => (
              <Link key={o.id} to={`/offer/${o.id}`} className="vt-storeoffer">
                <img src={o.imageUrl} alt={o.title} />
                <div className="vt-storeoffer-body">
                  <div className="vt-storeoffer-title">{o.title}</div>
                  <div className="vt-muted">{o.price}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="vt-card vt-card-pad">
          <div className="vt-h2">Contenido (Reels / Posts)</div>
          <div className="vt-muted" style={{ marginTop: 6 }}>
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

