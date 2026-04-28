import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ScrollText,
  Truck,
} from "lucide-react";
import { cn } from "../../lib/cn";
import type { StoreBadge } from "../../app/store/marketStoreTypes";
import type { StoreCatalog } from "../chat/domain/storeCatalogTypes";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";
import { ImageLightbox } from "../chat/components/media/ImageLightbox";
import { StoreLocationPreview } from "./StoreLocationPreview";
import { StoreTrustMini } from "../../components/StoreTrustMini";
import { TrustHistoryModal } from "../../components/TrustHistoryModal";
import { useAppStore } from "../../app/store/useAppStore";
import { EMPTY_TRUST_LEDGER_ENTRIES } from "../../app/store/trustLedgerTypes";
import { getSessionToken } from "../../utils/http/sessionToken";
import { fetchStoreTrustHistory } from "../../utils/trust/trustLedgerApi";
import type { StoreDetailOwner } from "../../utils/market/fetchStoreDetail";
import { websiteUrlDisplayLabel } from "../../utils/websiteUrl";
import { profileSectionPath } from "../../utils/navigation/profilePaths";

export function StoreIdentityBlock({
  store,
  catalog,
  joinedLabel,
  ownerProfile,
}: Readonly<{
  store: StoreBadge;
  catalog: StoreCatalog | undefined;
  joinedLabel: string | null;
  /** Dueño persistido (detalle de tienda): enlace a perfil con nombre, foto y confianza. */
  ownerProfile?: StoreDetailOwner | null;
}>) {
  const [avatarLightboxUrl, setAvatarLightboxUrl] = useState<string | null>(
    null,
  );
  const [trustHistoryOpen, setTrustHistoryOpen] = useState(false);
  const [trustHistoryLoading, setTrustHistoryLoading] = useState(false);
  const storeTrustEntries = useAppStore(
    (s) => s.storeTrustLedger[store.id] ?? EMPTY_TRUST_LEDGER_ENTRIES,
  );

  useEffect(() => {
    if (!trustHistoryOpen) return;
    const sid = store.id?.trim();
    if (!sid) return;
    if (!getSessionToken()) return;
    let cancelled = false;
    setTrustHistoryLoading(true);
    void fetchStoreTrustHistory(sid)
      .then((list) => {
        if (cancelled) return;
        useAppStore.setState((s) => ({
          storeTrustLedger: { ...s.storeTrustLedger, [sid]: list },
        }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTrustHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trustHistoryOpen, store.id]);

  return (
    <div className="vt-card vt-card-pad">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {store.avatarUrl ? (
            <div className="relative mt-0.5 h-14 w-14 shrink-0">
              <ProtectedMediaImg
                src={store.avatarUrl}
                alt=""
                wrapperClassName="h-14 w-14"
                className="h-14 w-14 rounded-[16px] border border-[var(--border)] object-cover"
              />
              <button
                type="button"
                className="absolute inset-0 z-[1] cursor-zoom-in rounded-[16px] bg-transparent"
                aria-label="Ver imagen de la tienda ampliada"
                title="Ver imagen ampliada"
                onClick={() => setAvatarLightboxUrl(store.avatarUrl!)}
              />
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="text-[22px] font-black tracking-[-0.03em]">
              {store.name}
            </div>
            <div className="vt-muted mt-1">{store.categories.join(" · ")}</div>
            {(() => {
              const text = (catalog?.pitch ?? store.pitch ?? "").trim();
              if (!text) return null;
              return (
                <p className="mt-2 max-w-[720px] text-[13px] leading-snug text-[var(--text)]">
                  {text}
                </p>
              );
            })()}
            {joinedLabel ? (
              <div className="vt-muted mt-2 inline-flex items-center gap-2 text-xs font-bold">
                <Calendar size={14} aria-hidden /> En la plataforma desde{" "}
                {joinedLabel}
              </div>
            ) : null}
            {store.websiteUrl?.trim() ? (
              <div className="mt-2">
                <a
                  href={store.websiteUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 text-[13px] font-bold text-[var(--primary)] hover:underline"
                >
                  <ExternalLink size={14} className="shrink-0" aria-hidden />
                  <span className="truncate">
                    {websiteUrlDisplayLabel(store.websiteUrl.trim())}
                  </span>
                </a>
              </div>
            ) : null}
          </div>
        </div>
        <div>
          {store.verified ? (
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-2.5 py-2 text-xs font-black",
                "bg-[color-mix(in_oklab,var(--good)_12%,transparent)] text-[color-mix(in_oklab,var(--good)_85%,var(--text))] dark:text-emerald-300",
              )}
            >
              <CheckCircle2 size={16} /> Verificado
            </span>
          ) : (
            <span className="vt-badge-verify-warn">
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

      <div className="mt-3 flex max-w-sm flex-col gap-2">
        <StoreTrustMini score={store.trustScore} />
        <button
          type="button"
          className="vt-btn vt-btn-ghost vt-btn-sm inline-flex w-full max-w-[280px] items-center justify-center gap-2"
          onClick={() => setTrustHistoryOpen(true)}
        >
          <ScrollText size={16} aria-hidden />
          Historial de confianza de la tienda
        </button>
      </div>

      {ownerProfile ? (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            Dueño de la tienda
          </div>
          <Link
            to={profileSectionPath(ownerProfile.id, "account")}
            className="relative mt-2 flex items-center gap-3 rounded-lg py-1.5 pr-7 text-inherit no-underline transition hover:bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]"
          >
            <span
              className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[16px] font-black text-[var(--text)]"
              aria-hidden
            >
              {ownerProfile.avatarUrl ? (
                <ProtectedMediaImg
                  src={ownerProfile.avatarUrl}
                  alt=""
                  wrapperClassName="h-11 w-11"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                ownerProfile.name.slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold leading-tight">{ownerProfile.name}</div>
              <div className="mt-1.5 max-w-[220px]">
                <StoreTrustMini
                  score={ownerProfile.trustScore}
                  ariaLabel="Confianza del usuario"
                />
              </div>
            </div>
            <ChevronRight
              size={18}
              className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 opacity-45"
              aria-hidden
            />
          </Link>
        </div>
      ) : null}

      {store.location ? (
        <StoreLocationPreview storeId={store.id} location={store.location} />
      ) : null}

      <ImageLightbox
        url={avatarLightboxUrl}
        onClose={() => setAvatarLightboxUrl(null)}
      />
      <TrustHistoryModal
        open={trustHistoryOpen}
        onClose={() => setTrustHistoryOpen(false)}
        title={`Historial — ${store.name}`}
        subtitle="Con sesión iniciada, los datos vienen del servidor. Sin sesión solo se listan cambios locales (demo)."
        entries={storeTrustEntries}
        loading={trustHistoryLoading}
      />
    </div>
  );
}
