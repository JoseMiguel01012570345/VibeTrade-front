import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CreditCard,
  ExternalLink,
  Image as ImageIcon,
  LogOut,
  Mail,
  Phone,
  Save,
  Send,
  User,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../../lib/cn";
import { backRowBtnClass } from "../store/storePageStyles";
import { type SocialNetworkId, useAppStore } from "../../app/store/useAppStore";
import type { Offer } from "../../app/store/marketStoreTypes";
import { useMarketStore } from "../../app/store/useMarketStore";
import { onBackdropPointerClose } from "../chat/lib/modalClose";
import {
  fieldLabel,
  modalFormBody,
  modalShellWide,
  modalSub,
} from "../chat/styles/formModalStyles";
import { ProfileStoresSection } from "./ProfileStoresSection";
import { ContactsModal } from "./ContactsModal";
import { reelTitlesById } from "../../utils/reels/reelsBootstrapState";
import { fetchPublicProfile } from "../../utils/auth/fetchPublicProfile";
import { logoutWebApp } from "../../utils/auth/logoutWebApp";
import {
  patchProfile,
  patchProfileAvatar,
} from "../../utils/auth/patchProfile";
import { userFromSessionJson } from "../../utils/auth/sessionUser";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";
import { mediaApiUrl, uploadMedia } from "../../utils/media/mediaClient";
import { StoreTrustMini } from "../../components/StoreTrustMini";
import { ConfirmModal } from "../../components/ConfirmModal";
import { UploadBlockingOverlay } from "../../components/UploadBlockingOverlay";
import { ImageLightbox } from "../chat/components/media/ImageLightbox";
import {
  isProfileSection,
  profileSectionPath,
  type ProfileSection,
} from "../../utils/navigation/profilePaths";
import {
  isToolPlaceholderUrl,
  TOOL_PLACEHOLDER_SRC,
} from "../../utils/market/toolPlaceholder";
import { fetchPublicOfferCard } from "../../utils/market/marketPersistence";
import { buildEmergentMapLegs } from "../../utils/map/emergentRouteMapLegs";
import { EmergentRouteFeedMap } from "../home/EmergentRouteFeedMap";
import { PaymentGatewayConfigModal } from "./PaymentGatewayConfigModal";
import { TrustBar } from "../../app/widgets/TrustBar";
import { ThemeToggle } from "../../app/widgets/ThemeToggle";
import { UserTrustHistoryButton } from "../../app/widgets/UserTrustHistoryButton";

function isValidEmail(value: string): boolean {
  const t = value.trim();
  if (t.length < 5) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function revokeBlobUrlLocal(url: string | null | undefined) {
  if (!url?.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* noop */
  }
}

const SOCIAL_META: Record<
  SocialNetworkId,
  { title: string; hint: string; placeholder: string; short: string }
> = {
  instagram: {
    title: "Conectar Instagram",
    hint: "Puedes guardar tu @usuario o un enlace a tu perfil.",
    placeholder: "@mi_empresa o https://instagram.com/…",
    short: "Instagram",
  },
  telegram: {
    title: "Conectar Telegram",
    hint: "Usuario público (sin @) o enlace t.me/…",
    placeholder: "usuario o https://t.me/…",
    short: "Telegram",
  },
  x: {
    title: "Conectar X",
    hint: "Tu @ de X o enlace al perfil.",
    placeholder: "@empresa",
    short: "X",
  },
};

function UserAvatarBadge({
  avatarUrl,
  fallbackLetter,
  sizeClass,
  title,
  onPickClick,
  onPreviewClick,
  interactive,
}: {
  avatarUrl?: string;
  fallbackLetter: string;
  sizeClass: string;
  title: string;
  onPickClick?: () => void;
  onPreviewClick?: () => void;
  interactive?: boolean;
}) {
  const inner = (
    <>
      {avatarUrl ? (
        <ProtectedMediaImg
          src={avatarUrl}
          alt=""
          wrapperClassName="h-full w-full"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-lg font-black text-white">{fallbackLetter}</span>
      )}
    </>
  );

  const shellClass = cn(
    "relative grid place-items-center overflow-hidden rounded-[18px] bg-gradient-to-br from-[var(--primary)] to-violet-600 text-white",
    sizeClass,
    interactive &&
      "ring-offset-2 transition hover:opacity-95 focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--primary)]",
  );

  if (interactive && onPickClick) {
    const canPreview = Boolean(avatarUrl) && Boolean(onPreviewClick);
    return (
      <div className={shellClass}>
        {inner}
        {canPreview ? (
          <>
            <span
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(2,6,23,0.18)] via-transparent to-transparent"
              aria-hidden
            />
            <button
              type="button"
              className="absolute inset-0 z-[1] cursor-zoom-in"
              onClick={() => onPreviewClick?.()}
              aria-label="Ver foto de perfil"
              title="Ver foto de perfil"
            />
            <button
              type="button"
              className={cn(
                "absolute bottom-1 right-1 z-[2] grid h-7 w-7 place-items-center rounded-full",
                "border border-white/25 bg-[rgba(2,6,23,0.45)] text-white backdrop-blur-[8px]",
                "hover:bg-[rgba(2,6,23,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onPickClick();
              }}
              aria-label="Cambiar foto"
              title="Cambiar foto"
            >
              <Camera size={14} aria-hidden />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="absolute inset-0 z-[1]"
            onClick={onPickClick}
            aria-label={title}
            title={title}
          />
        )}
      </div>
    );
  }

  return <div className={shellClass}>{inner}</div>;
}

export function ProfilePage() {
  const { userId, section: sectionParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);
  const stores = useMarketStore((s) => s.stores);
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames);
  const profileAvatarUrls = useAppStore((s) => s.profileAvatarUrls);
  const profileSocialLinks = useAppStore((s) => s.profileSocialLinks);
  const applySessionUser = useAppStore((s) => s.applySessionUser);
  const saved = useAppStore((s) => s.savedReels);
  const savedOffers = useAppStore((s) => s.savedOffers);
  const offers = useMarketStore((s) => s.offers);
  const routeOfferPublic = useMarketStore((s) => s.routeOfferPublic);

  const isMe = userId === "me" || userId === me.id;
  const resolvedProfileUserId = isMe ? me.id : (userId ?? me.id);

  const safeName = me.name ?? "";
  const safeEmail = me.email ?? "";

  const storesForProfile = useMemo(() => {
    return Object.values(stores).filter(
      (b) => b.ownerUserId === resolvedProfileUserId,
    );
  }, [stores, resolvedProfileUserId]);

  const reelTitles = useMemo(() => reelTitlesById(), []);

  const [visitorPublic, setVisitorPublic] = useState<{
    id: string;
    name: string;
    avatarUrl?: string;
    trustScore: number;
  } | null>(null);
  const [visitorPublicStatus, setVisitorPublicStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  useEffect(() => {
    if (!userId || isMe) {
      setVisitorPublic(null);
      setVisitorPublicStatus("idle");
      return;
    }
    const uid = resolvedProfileUserId;
    let cancelled = false;
    setVisitorPublicStatus("loading");
    void fetchPublicProfile(uid)
      .then((p) => {
        if (cancelled) return;
        if (p) {
          setVisitorPublic(p);
          useAppStore.setState((s) => ({
            profileDisplayNames: {
              ...s.profileDisplayNames,
              [p.id]: p.name,
            },
            profileTrustScores: {
              ...s.profileTrustScores,
              [p.id]: p.trustScore,
            },
            ...(p.avatarUrl?.trim()
              ? {
                  profileAvatarUrls: {
                    ...s.profileAvatarUrls,
                    [p.id]: p.avatarUrl.trim(),
                  },
                }
              : {}),
          }));
        } else {
          setVisitorPublic(null);
        }
        setVisitorPublicStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setVisitorPublicStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, isMe, resolvedProfileUserId]);

  const profileDisplayName = isMe
    ? safeName
    : visitorPublic?.name?.trim() ||
      profileDisplayNames[resolvedProfileUserId]?.trim() ||
      `Usuario ${resolvedProfileUserId}`;

  const [socialModal, setSocialModal] = useState<SocialNetworkId | null>(null);
  const [socialDraft, setSocialDraft] = useState("");
  const [nameDraft, setNameDraft] = useState(safeName);
  const [emailDraft, setEmailDraft] = useState(safeEmail);
  const [avatarDraftUrl, setAvatarDraftUrl] = useState<string | null>(null);
  const avatarDraftRef = useRef<string | null>(null);
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);
  const [profileUploadBusy, setProfileUploadBusy] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [paymentConfigOpen, setPaymentConfigOpen] = useState(false);

  useEffect(() => {
    if (!isMe) return;
    if (searchParams.get("stripeCards") !== "1") return;
    setPaymentConfigOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("stripeCards");
    setSearchParams(next, { replace: true });
  }, [isMe, searchParams, setSearchParams]);

  const tab: ProfileSection =
    sectionParam && isProfileSection(sectionParam) ? sectionParam : "account";

  useEffect(() => {
    avatarDraftRef.current = avatarDraftUrl;
  }, [avatarDraftUrl]);

  useEffect(
    () => () => {
      revokeBlobUrlLocal(avatarDraftRef.current);
    },
    [],
  );

  useEffect(() => {
    setNameDraft(safeName);
  }, [safeName]);

  useEffect(() => {
    setEmailDraft(safeEmail);
  }, [safeEmail]);

  useEffect(() => {
    if (!userId) return;
    if (tab === "stores" && storesForProfile.length === 0 && !isMe) {
      nav(profileSectionPath(userId, "account"), { replace: true });
    }
  }, [tab, storesForProfile.length, isMe, userId, nav]);

  useEffect(() => {
    if (!userId) return;
    if (tab === "reels" && !isMe) {
      nav(profileSectionPath(userId, "account"), { replace: true });
    }
  }, [tab, isMe, userId, nav]);

  useEffect(() => {
    if (!userId) return;
    if (tab === "saved" && !isMe) {
      nav(profileSectionPath(userId, "account"), { replace: true });
    }
  }, [tab, isMe, userId, nav]);

  const savedOfferIds = useMemo(
    () => Object.keys(savedOffers).filter((id) => savedOffers[id]),
    [savedOffers],
  );

  const savedOfferItems = useMemo((): Offer[] => {
    const list = savedOfferIds
      .map((id) => offers[id])
      .filter((o): o is Offer => o != null);
    return [...list].sort((a, b) =>
      a.title.localeCompare(b.title, "es", { sensitivity: "base" }),
    );
  }, [savedOfferIds, offers]);

  const savedOfferIdsKey = useMemo(
    () => savedOfferIds.slice().sort().join("\u0000"),
    [savedOfferIds],
  );

  /** Si falta la ficha en memoria (p. ej. abriste Guardados en frío), pedimos `/card` por cada id guardado. Las hojas de ruta usan id `emo_*`. */
  useEffect(() => {
    if (tab !== "saved" || !isMe) return;
    const ids = Object.keys(useAppStore.getState().savedOffers).filter(
      (i) => useAppStore.getState().savedOffers[i],
    );
    if (ids.length === 0) return;
    const missing = ids.filter((id) => !useMarketStore.getState().offers[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const id of missing) {
        if (cancelled) return;
        try {
          const r = await fetchPublicOfferCard(id);
          if (!r || cancelled) continue;
          const storeKey = r.store.id?.trim() || r.offer.storeId;
          const merged: Offer = { ...r.offer, id };
          useMarketStore.setState((s) => {
            if (s.offers[id]) return s;
            const nextStores = { ...s.stores };
            if (storeKey) {
              nextStores[storeKey] = {
                ...s.stores[storeKey],
                ...r.store,
                id: storeKey,
              };
            }
            return {
              ...s,
              offers: { ...s.offers, [id]: merged },
              stores: nextStores,
            };
          });
        } catch {
          /* offline / 404 */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, isMe, savedOfferIdsKey]);

  const savedIds = useMemo(
    () => Object.keys(saved).filter((id) => saved[id]),
    [saved],
  );

  function openSocialModal(net: SocialNetworkId) {
    setSocialDraft(profileSocialLinks[net] ?? "");
    setSocialModal(net);
  }

  async function onProfileAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const picked = input.files ? Array.from(input.files) : [];
    input.value = "";
    const file = picked[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elige un archivo de imagen.");
      return;
    }
    setProfileUploadBusy(true);
    try {
      const uploaded = await uploadMedia(file);
      const url = mediaApiUrl(uploaded.id);
      setAvatarDraftUrl((prev) => {
        revokeBlobUrlLocal(prev);
        return url;
      });
      toast.success("Revisa la imagen y toca Guardar para confirmar.");
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "No se pudo subir la imagen.";
      toast.error(msg);
    } finally {
      setProfileUploadBusy(false);
    }
  }

  async function saveProfileAvatar() {
    if (!avatarDraftUrl) return;
    if (!avatarDraftUrl.startsWith("/api/v1/media/")) {
      toast.error("Guarda de nuevo: la foto debe subirse al servidor.");
      return;
    }
    setProfileUploadBusy(true);
    try {
      const userJson = await patchProfileAvatar(avatarDraftUrl);
      applySessionUser(userFromSessionJson(userJson));
      avatarDraftRef.current = null;
      setAvatarDraftUrl(null);
      toast.success("Foto de perfil guardada");
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "No se pudo guardar la foto de perfil.";
      toast.error(msg);
    } finally {
      setProfileUploadBusy(false);
    }
  }

  function discardProfileAvatarDraft() {
    setAvatarDraftUrl((prev) => {
      revokeBlobUrlLocal(prev);
      return null;
    });
  }

  const visitorAvatarDisplay =
    visitorPublic?.avatarUrl || profileAvatarUrls[resolvedProfileUserId];

  const letter =
    (isMe
      ? safeName
      : visitorPublic?.name ||
        profileDisplayNames[resolvedProfileUserId] ||
        userId ||
        "U"
    )
      .slice(0, 1)
      .toUpperCase() || "?";

  const nameDirty = isMe && nameDraft.trim() !== safeName.trim();
  const emailDirty =
    isMe && emailDraft.trim().toLowerCase() !== safeEmail.trim().toLowerCase();
  const profileAvatarDirty = isMe && avatarDraftUrl !== null;
  const profileAvatarDisplayUrl = avatarDraftUrl ?? me.avatarUrl;

  async function saveDisplayName() {
    const t = nameDraft.trim();
    if (t.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    try {
      const userJson = await patchProfile({ name: t });
      applySessionUser(userFromSessionJson(userJson));
      toast.success("Nombre guardado");
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "No se pudo guardar el nombre.";
      toast.error(msg);
    }
  }

  async function saveEmailField() {
    const t = emailDraft.trim();
    if (!isValidEmail(t)) {
      toast.error("Ingresá un email válido.");
      return;
    }
    try {
      const userJson = await patchProfile({ email: t });
      applySessionUser(userFromSessionJson(userJson));
      toast.success("Email guardado");
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "No se pudo guardar el email.";
      toast.error(msg);
    }
  }

  const socialModalMeta = socialModal ? SOCIAL_META[socialModal] : null;

  async function saveSocialFromModal() {
    if (!socialModal) return;
    const t = socialDraft.trim();
    try {
      const userJson = await patchProfile(
        socialModal === "instagram"
          ? { instagram: t }
          : socialModal === "telegram"
            ? { telegram: t }
            : { xAccount: t },
      );
      applySessionUser(userFromSessionJson(userJson));
      setSocialModal(null);
      toast.success("Enlace guardado");
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "No se pudo guardar el enlace.";
      toast.error(msg);
    }
  }

  if (!userId) {
    return <Navigate to="/home" replace />;
  }

  if (sectionParam && !isProfileSection(sectionParam)) {
    return <Navigate to={profileSectionPath(userId, "account")} replace />;
  }

  return (
    <div className="container vt-page">
      <UploadBlockingOverlay
        active={profileUploadBusy}
        message="Procesando imagen…"
      />
      <input
        ref={profileAvatarInputRef}
        type="file"
        className="sr-only"
        accept="image/*"
        aria-label="Subir foto de perfil"
        onChange={onProfileAvatarChange}
      />

      <div className="flex flex-col gap-3.5">
        <div className="vt-card vt-card-pad">
          <div className="flex min-w-0 items-center gap-3 pr-[3.25rem]">
            <button
              type="button"
              className={backRowBtnClass}
              onClick={() => nav(-1)}
              aria-label="Volver"
              style={{
                minWidth: 40,
                minHeight: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-black tracking-[-0.03em]">
              {isMe ? "Perfil" : `Perfil · ${profileDisplayName}`}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to={profileSectionPath(userId, "account")}
            className={cn(
              "min-w-[calc(50%-6px)] flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-center font-black no-underline sm:min-w-0",
              tab === "account" &&
                "border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]",
            )}
          >
            Cuenta
          </Link>
          {isMe ? (
            <Link
              to={profileSectionPath(userId, "reels")}
              className={cn(
                "min-w-[calc(50%-6px)] flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-center font-black no-underline sm:min-w-0",
                tab === "reels" &&
                  "border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]",
              )}
            >
              Mis Reels
            </Link>
          ) : null}
          {isMe ? (
            <Link
              to={profileSectionPath(userId, "saved")}
              className={cn(
                "min-w-[calc(50%-6px)] flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-center font-black no-underline sm:min-w-0",
                tab === "saved" &&
                  "border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]",
              )}
            >
              Guardados
            </Link>
          ) : null}
          {isMe || storesForProfile.length > 0 ? (
            <Link
              to={profileSectionPath(userId, "stores")}
              className={cn(
                "min-w-[calc(50%-6px)] flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-center font-black no-underline sm:min-w-0",
                tab === "stores" &&
                  "border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]",
              )}
            >
              Tiendas
            </Link>
          ) : null}
        </div>

        {tab === "account" && (
          <div className="vt-card vt-card-pad">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div className="vt-h2">Configuración del usuario</div>
              {isMe ? (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <UserTrustHistoryButton />
                  <ThemeToggle />
                </div>
              ) : null}
            </div>
            <div className="vt-divider my-3" />

            {!isMe ? (
              <div className="mb-4 flex flex-col items-center gap-3 border-b border-[var(--border)] pb-4 text-center sm:flex-row sm:items-start sm:text-left">
                <UserAvatarBadge
                  avatarUrl={visitorAvatarDisplay}
                  fallbackLetter={letter}
                  sizeClass="h-[88px] w-[88px] shrink-0 text-2xl"
                  title="Foto de perfil"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {visitorPublicStatus === "loading" ||
                  visitorPublicStatus === "idle" ? (
                    <div className="text-sm text-[var(--muted)]">
                      Cargando perfil…
                    </div>
                  ) : visitorPublic != null ? (
                    <StoreTrustMini
                      score={visitorPublic.trustScore}
                      ariaLabel="Confianza del usuario"
                    />
                  ) : visitorPublicStatus === "error" ? (
                    <div className="text-sm text-[var(--muted)]">
                      No se pudieron cargar los datos públicos del perfil.
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--muted)]">
                      No hay perfil público para este usuario.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {isMe ? (
              <div className="mb-4 border-b border-[var(--border)] pb-4">
                <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
                  <UserAvatarBadge
                    avatarUrl={profileAvatarDisplayUrl}
                    fallbackLetter={letter}
                    sizeClass="h-[88px] w-[88px] shrink-0 text-2xl"
                    title="Elegir foto de perfil"
                    interactive
                    onPickClick={() => profileAvatarInputRef.current?.click()}
                    onPreviewClick={() =>
                      setAvatarPreviewUrl(profileAvatarDisplayUrl ?? null)
                    }
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div>
                      <div className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                        <ImageIcon size={14} /> Foto de perfil
                      </div>
                      <p className="vt-muted mt-1 max-w-md text-[13px] leading-snug">
                        Elige una imagen desde tu dispositivo y guárdala con el
                        botón (vista previa local con URL blob).
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <button
                        type="button"
                        className="vt-btn vt-btn-primary vt-btn-sm inline-flex items-center gap-1.5"
                        disabled={!profileAvatarDirty}
                        onClick={saveProfileAvatar}
                      >
                        <Save size={14} aria-hidden /> Guardar foto
                      </button>
                      <button
                        type="button"
                        className="vt-btn vt-btn-ghost vt-btn-sm"
                        disabled={!profileAvatarDirty}
                        onClick={discardProfileAvatarDraft}
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 min-w-0">
                  <TrustBar />
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                  <User size={14} /> Nombre
                </span>
                {isMe ? (
                  <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-stretch">
                    <input
                      className="vt-input min-w-0 flex-1"
                      value={nameDraft}
                      onChange={(e) =>
                        setNameDraft(e.target.value.slice(0, 100))
                      }
                      autoComplete="name"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      className="vt-btn vt-btn-primary vt-btn-sm inline-flex shrink-0 items-center justify-center gap-1.5 min-[480px]:self-stretch"
                      disabled={!nameDirty}
                      onClick={saveDisplayName}
                    >
                      <Save size={14} aria-hidden /> Guardar
                    </button>
                  </div>
                ) : (
                  <input
                    className="vt-input"
                    value={profileDisplayName}
                    disabled
                    readOnly
                  />
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                  <Mail size={14} /> Email (obligatorio)
                </span>
                {isMe ? (
                  <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-stretch">
                    <input
                      className="vt-input min-w-0 flex-1"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={emailDraft}
                      onChange={(e) =>
                        setEmailDraft(e.target.value.slice(0, 120))
                      }
                      maxLength={120}
                    />
                    <button
                      type="button"
                      className="vt-btn vt-btn-primary vt-btn-sm inline-flex shrink-0 items-center justify-center gap-1.5 min-[480px]:self-stretch"
                      disabled={!emailDirty}
                      onClick={saveEmailField}
                    >
                      <Save size={14} aria-hidden /> Guardar
                    </button>
                  </div>
                ) : (
                  <input className="vt-input" value="—" disabled readOnly />
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                  <Phone size={14} /> Teléfono (obligatorio)
                </span>
                <input
                  className="vt-input"
                  value={isMe ? "+" + (me.phone ?? "") : "—"}
                  disabled
                  readOnly
                />
              </label>

              {isMe ? (
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                    <Users size={14} /> Agenda en la plataforma
                  </div>
                  <p className="vt-muted max-w-md text-[13px] leading-snug">
                    Guarda números de otros usuarios registrados para verlos con
                    nombre y teléfono del perfil.
                  </p>
                  <button
                    type="button"
                    className="vt-btn inline-flex w-fit items-center gap-2"
                    onClick={() => setContactsModalOpen(true)}
                  >
                    <Users size={16} aria-hidden /> Contactos
                  </button>
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                  <ExternalLink size={14} /> Multi-cuenta (Instagram / Telegram
                  / X)
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    className="vt-btn"
                    disabled={!isMe}
                    onClick={() => isMe && openSocialModal("instagram")}
                  >
                    <Camera size={16} aria-hidden /> Conectar Instagram
                  </button>
                  <button
                    type="button"
                    className="vt-btn"
                    disabled={!isMe}
                    onClick={() => isMe && openSocialModal("telegram")}
                  >
                    <Send size={16} aria-hidden /> Conectar Telegram
                  </button>
                  <button
                    type="button"
                    className="vt-btn"
                    disabled={!isMe}
                    onClick={() => isMe && openSocialModal("x")}
                  >
                    Conectar X
                  </button>
                </div>
                {isMe &&
                (profileSocialLinks.instagram ||
                  profileSocialLinks.telegram ||
                  profileSocialLinks.x) ? (
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                      Cuentas guardadas
                    </div>
                    <ul className="mt-2 space-y-2 text-[13px]">
                      {(
                        ["instagram", "telegram", "x"] as SocialNetworkId[]
                      ).map((id) => {
                        const v = profileSocialLinks[id];
                        if (!v) return null;
                        return (
                          <li
                            key={id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2"
                          >
                            <span className="font-bold text-[var(--text)]">
                              {SOCIAL_META[id].short}
                            </span>
                            <span
                              className="vt-muted min-w-0 flex-1 truncate text-right font-mono text-[12px]"
                              title={v}
                            >
                              {v}
                            </span>
                            <button
                              type="button"
                              className="vt-btn vt-btn-ghost vt-btn-sm shrink-0"
                              onClick={() => openSocialModal(id)}
                            >
                              Editar
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>

              {isMe && (
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                    <CreditCard size={14} /> Configurar tarjetas de pago (solo
                    propietario)
                  </div>
                  <div className="vt-muted">
                    Elige una pasarela y añade credenciales necesarias por
                    pasarela (demo).
                  </div>
                  <button
                    type="button"
                    className="vt-btn"
                    onClick={() => setPaymentConfigOpen(true)}
                  >
                    Configurar
                  </button>
                </div>
              )}

              {isMe && (
                <div className="mt-6 flex flex-col gap-2 border-t border-[var(--border)] pt-5">
                  <button
                    type="button"
                    className="vt-btn inline-flex items-center justify-center gap-2 border-[color-mix(in_oklab,var(--bad)_45%,var(--border))] text-[var(--bad)]"
                    onClick={() => setLogoutConfirmOpen(true)}
                  >
                    <LogOut size={16} aria-hidden /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "stores" && (isMe || storesForProfile.length > 0) ? (
          <ProfileStoresSection
            ownerUserId={resolvedProfileUserId}
            canEdit={isMe}
          />
        ) : null}

        {tab === "saved" && isMe ? (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Ofertas guardadas</div>
            <div className="vt-muted mt-1.5">
              Toca una tarjeta para abrir la oferta. Puedes guardar desde el
              ícono de marcador en el listado o en el detalle.
            </div>
            <div className="vt-divider my-3" />
            {savedOfferItems.length === 0 ? (
              <div className="vt-muted">Aún no guardaste ofertas.</div>
            ) : (
              <div className="grid grid-cols-12 gap-3.5">
                {savedOfferItems.map((o, idx) => {
                  const store = stores[o.storeId];
                  const routePreview =
                    routeOfferPublic[o.id] ??
                    (o.emergentBaseOfferId?.trim()
                      ? routeOfferPublic[o.emergentBaseOfferId.trim()]
                      : undefined);
                  const isEmergentRouteCard =
                    o.isEmergentRoutePublication === true ||
                    (o.tags?.includes("Hoja de ruta (publicada)") &&
                      !!routePreview);
                  const mapLegs = buildEmergentMapLegs(o, routePreview);
                  const thumbSrc =
                    o.imageUrl?.trim() ||
                    (o.tags.includes("Servicio")
                      ? TOOL_PLACEHOLDER_SRC
                      : undefined);
                  const isToolPlaceholder = isToolPlaceholderUrl(thumbSrc);
                  return (
                    <Link
                      key={o.id}
                      to={`/offer/${o.id}`}
                      className={cn(
                        "vt-card col-span-12 overflow-hidden min-[640px]:col-span-6 no-underline text-[var(--text)]",
                        isEmergentRouteCard
                          ? "group"
                          : !isToolPlaceholder && "group",
                      )}
                    >
                      <div className="relative h-[160px] overflow-hidden bg-gray-200">
                        {isEmergentRouteCard ? (
                          <div
                            className={cn(
                              "flex h-full min-h-[160px] w-full flex-col overflow-hidden transition-transform duration-[240ms] ease-out will-change-transform",
                              "group-hover:scale-[1.03]",
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
                              "block h-full w-full min-h-[160px] transition-transform duration-[240ms] ease-out",
                              isToolPlaceholder
                                ? "vt-img-tool-placeholder p-3 sm:p-4"
                                : "object-cover group-hover:scale-[1.04]",
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
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {tab === "reels" && (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Reels guardados</div>
            <div className="vt-muted mt-1.5">
              Reels guardados desde la barra lateral de la experiencia
              inmersiva.
            </div>
            <div className="vt-divider my-3" />
            {savedIds.length === 0 ? (
              <div className="vt-muted">Aún no guardaste Reels.</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {savedIds.map((id) => (
                  <div
                    key={id}
                    className="flex items-center gap-2.5 rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-3 py-2.5"
                  >
                    <Save size={16} aria-hidden />
                    <div>
                      <div className="font-black tracking-[-0.02em]">
                        {reelTitles[id] ?? id}
                      </div>
                      <div className="vt-muted">ID: {id}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ContactsModal
        open={contactsModalOpen}
        onClose={() => setContactsModalOpen(false)}
      />

      {socialModal && socialModalMeta ? (
        <div
          className="vt-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-social-modal-title"
          onMouseDown={(e) =>
            onBackdropPointerClose(e, () => setSocialModal(null))
          }
        >
          <div
            className={modalShellWide}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="vt-modal-title" id="profile-social-modal-title">
              {socialModalMeta.title}
            </div>
            <div className={modalSub}>{socialModalMeta.hint}</div>
            <div className={modalFormBody}>
              <label className="flex flex-col gap-2">
                <span className={fieldLabel}>Usuario o enlace</span>
                <input
                  className="vt-input"
                  autoFocus
                  placeholder={socialModalMeta.placeholder}
                  value={socialDraft}
                  onChange={(e) => setSocialDraft(e.target.value)}
                />
              </label>
            </div>
            <div className="vt-modal-actions">
              <button
                type="button"
                className="vt-btn"
                onClick={() => setSocialModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="vt-btn vt-btn-primary"
                onClick={() => {
                  void saveSocialFromModal();
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={logoutConfirmOpen}
        title="¿Cerrar sesión?"
        message="Vas a salir de tu cuenta en este dispositivo. Puedes volver a iniciar sesión cuando quieras."
        cancelLabel="Cancelar"
        confirmLabel="Cerrar sesión"
        confirmBusy={logoutBusy}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          void (async () => {
            setLogoutBusy(true);
            try {
              await logoutWebApp();
              setLogoutConfirmOpen(false);
              nav("/onboarding/phone", { replace: true });
              toast.success("Sesión cerrada");
            } finally {
              setLogoutBusy(false);
            }
          })();
        }}
      />

      <PaymentGatewayConfigModal
        open={paymentConfigOpen}
        onClose={() => setPaymentConfigOpen(false)}
      />

      <ImageLightbox
        url={avatarPreviewUrl}
        onClose={() => setAvatarPreviewUrl(null)}
      />
    </div>
  );
}
