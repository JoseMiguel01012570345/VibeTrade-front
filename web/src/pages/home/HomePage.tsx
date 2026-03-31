import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMarketStore } from "../../app/store/useMarketStore";
import "./home.css";

export function HomePage() {
  const offerIds = useMarketStore((s) => s.offerIds);
  const offers = useMarketStore((s) => s.offers);
  const stores = useMarketStore((s) => s.stores);

  const items = useMemo(
    () => offerIds.map((id) => offers[id]).filter(Boolean),
    [offerIds, offers],
  );

  return (
    <div className="container vt-page">
      <div className="vt-home-head">
        <div>
          <h1 className="vt-h1">Ofertas</h1>
          <div className="vt-muted">
            Scroll con ofertas afines a tus intereses (demo).
          </div>
        </div>
      </div>

      <div className="vt-home-grid">
        {items.map((o) => {
          const store = stores[o.storeId];
          return (
            <div key={o.id} className="vt-card vt-offer">
              <Link to={`/offer/${o.id}`} className="vt-offer-media">
                <img src={o.imageUrl} alt={o.title} />
              </Link>

              <div className="vt-offer-body">
                <div className="vt-offer-top">
                  <div className="vt-offer-title">
                    <Link to={`/offer/${o.id}`}>{o.title}</Link>
                  </div>
                  <div className="vt-offer-price">{o.price}</div>
                </div>

                <div className="vt-offer-sub">
                  <div className="vt-muted">{o.location}</div>
                  <Link to={`/store/${store.id}`} className="vt-store-badge">
                    <span className="vt-store-dot" />
                    {store.name}
                  </Link>
                </div>

                <div className="vt-offer-tags">
                  {o.tags.map((t) => (
                    <span key={t} className="vt-pill">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
