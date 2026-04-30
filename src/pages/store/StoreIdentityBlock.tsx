import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
  ScrollText,
} from "lucide-react";
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
    <div className="vt-card vt-card-pad min-w-0 max-w-full">
      <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between min-[480px]:gap-3">
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
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 break-words text-[clamp(17px,4.8vw,22px)] font-black tracking-[-0.03em]">
              <span>{store.name}</span>
              {store.verified ? (
                <span
                  className="inline-flex items-center text-[var(--primary)]"
                  title="Verificado"
                  aria-label="Verificado"
                >
                  <BadgeCheck size={20} aria-hidden />
                </span>
              ) : null}
            </div>
            <div className="vt-muted mt-1 break-words text-[13px] leading-snug">
              {store.categories.join(" · ")}
            </div>
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
        <div className="shrink-0 self-start min-[480px]:ml-auto" />
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
