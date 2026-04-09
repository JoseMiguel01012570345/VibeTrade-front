import { AlertTriangle, Calendar, CheckCircle2, Truck } from "lucide-react";
import { cn } from "../../lib/cn";
import type { StoreBadge } from "../../app/store/marketStoreTypes";
import type { StoreCatalog } from "../chat/domain/storeCatalogTypes";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";

export function StoreIdentityBlock({
  store,
  catalog,
  joinedLabel,
}: Readonly<{
  store: StoreBadge;
  catalog: StoreCatalog | undefined;
  joinedLabel: string | null;
}>) {
  return (
    <div className="vt-card vt-card-pad">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {store.avatarUrl ? (
            <ProtectedMediaImg
              src={store.avatarUrl}
              alt=""
              wrapperClassName="mt-0.5 h-14 w-14 shrink-0"
              className="h-14 w-14 rounded-[16px] border border-[var(--border)] object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <div className="text-[22px] font-black tracking-[-0.03em]">
              {store.name}
            </div>
            <div className="vt-muted mt-1">{store.categories.join(" · ")}</div>
            {catalog?.pitch ? (
              <p className="mt-2 max-w-[720px] text-[13px] leading-snug text-[var(--text)]">
                {catalog.pitch}
              </p>
            ) : null}
            {joinedLabel ? (
              <div className="vt-muted mt-2 inline-flex items-center gap-2 text-xs font-bold">
                <Calendar size={14} aria-hidden /> En la plataforma desde{" "}
                {joinedLabel}
              </div>
            ) : null}
          </div>
        </div>
        <div>
          {store.verified ? (
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-2.5 py-2 text-xs font-black",
                "bg-[color-mix(in_oklab,var(--good)_12%,transparent)] text-[color-mix(in_oklab,var(--good)_85%,var(--text))]",
              )}
            >
              <CheckCircle2 size={16} /> Verificado
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-2.5 py-2 text-xs font-black",
                "bg-[color-mix(in_oklab,var(--bad)_10%,transparent)] text-[color-mix(in_oklab,var(--bad)_80%,var(--text))]",
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
            "inline-flex items-center gap-2 rounded-full border px-2.5 py-2 text-xs font-black",
            store.transportIncluded
              ? "border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))]"
              : "border-[color-mix(in_oklab,#d97706_40%,var(--border))] bg-[color-mix(in_oklab,#d97706_14%,var(--surface))] text-[var(--text)]",
          )}
        >
          <Truck size={16} /> Transporte{" "}
          {store.transportIncluded ? "incluido" : "NO incluido"}
        </span>
        {!store.transportIncluded ? (
          <span className="vt-muted text-[13px]">
            Etiqueta explícita para evitar dudas en el chat: el transporte no
            forma parte de la oferta salvo que se negocie en el acuerdo.
          </span>
        ) : null}
      </div>
    </div>
  );
}
