import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import { PointLocationFeedMap } from "@features/home/components/EmergentRouteFeedMap";

const heroPills = [
  { label: "Seguro" },
  { label: "Rápido" },
  { label: "Directo" },
  { label: "Supermercado" },
];

export function StorefrontHeroBanner({
  store,
  pitch,
}: Readonly<{
  store: StoreBadge;
  pitch: string;
  productCount: number;
}>) {
  const hasPitch = pitch.trim().length > 0;
  const headline = `Haz tu pedido. Nosotros nos encargamos del resto`;

  return (
    <section aria-label="Banner principal" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[60px] bg-slate-300/40 blur-3xl sm:-inset-12 vt-storefront-banner-glow"
      />
      <div className="vt-storefront-hero-panel relative overflow-hidden rounded-[24px] border border-[#d9d5cf] bg-white px-6 py-8 sm:rounded-[28px] sm:px-10 sm:py-10">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h2 className="max-w-xs text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
              {headline}
            </h2>

            {hasPitch ? (
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                {pitch.trim()}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {heroPills.map((pill) => (
                <span
                  key={pill.label}
                  className="vt-storefront-control inline-flex items-center gap-1.5 rounded-full border border-[#d9d5cf] bg-stone-50 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  <span className="vt-storefront-accent-dot h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden />
                  {pill.label}
                </span>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Menos de
              </p>
              <p className="text-4xl font-black leading-none text-slate-900 sm:text-5xl">
                24H
              </p>
              <span className="vt-storefront-accent-btn mt-1 inline-block rounded-md bg-emerald-600 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-white">
                {store.name ? `${store.name} entrega` : "Entregamos"}
              </span>
            </div>
          </div>

          <div className="hidden shrink-0 sm:block">
            {store.location ? (
              <div className="h-[160px] w-[220px] overflow-hidden rounded-[16px] border border-[#d9d5cf]">
                <PointLocationFeedMap
                  location={store.location}
                  mapKey={`hero-map-${store.id}`}
                  fixedZoom={14}
                  showAttribution={false}
                  className="h-full w-full [&_.leaflet-control-zoom]:hidden [&_.leaflet-control-attribution]:hidden"
                />
              </div>
            ) : (
              <svg
                aria-hidden
                width="220"
                height="160"
                viewBox="0 0 220 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-90"
              >
                <ellipse cx="110" cy="148" rx="90" ry="10" fill="#e2ddd8" />
                <path d="M60 130 Q55 80 90 60 Q120 40 150 55 Q185 70 185 110 Q185 130 165 138 L60 138Z" fill="#16a34a" />
                <rect x="78" y="62" width="34" height="46" rx="4" fill="white" />
                <rect x="82" y="66" width="26" height="6" rx="2" fill="#e2e8f0" />
                <rect x="82" y="75" width="18" height="4" rx="1" fill="#cbd5e1" />
                <rect x="82" y="82" width="22" height="4" rx="1" fill="#cbd5e1" />
                <circle cx="95" cy="44" r="14" fill="#fde68a" />
                <rect x="89" y="58" width="12" height="18" rx="3" fill="#1e293b" />
                <path d="M86 62 Q78 68 76 80" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                <path d="M104 62 Q116 72 120 88" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                <rect x="73" y="115" width="50" height="22" rx="5" fill="#15803d" />
                <circle cx="80" cy="140" r="6" fill="#374151" />
                <circle cx="116" cy="140" r="6" fill="#374151" />
                <path d="M20 100 Q60 60 110 70" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" />
                <path d="M110 70 Q155 78 185 50" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
                <polygon points="185,44 192,52 178,52" fill="#22c55e" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
