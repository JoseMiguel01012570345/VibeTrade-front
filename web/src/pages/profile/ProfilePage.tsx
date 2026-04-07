import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../../lib/cn";
import { type SocialNetworkId, useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { onBackdropPointerClose } from "../chat/lib/modalClose";
import {
  fieldLabel,
  modalFormBody,
  modalShellWide,
  modalSub,
} from "../chat/styles/formModalStyles";
import { ProfileStoresSection } from "./ProfileStoresSection";
import { reelTitlesById } from "../../utils/reels/reelsBootstrapState";
import { logoutWebApp } from "../../utils/auth/logoutWebApp";

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
    hint: "Podés guardar tu @usuario o un enlace a tu perfil.",
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
  interactive,
}: {
  avatarUrl?: string;
  fallbackLetter: string;
  sizeClass: string;
  title: string;
  onPickClick?: () => void;
  interactive?: boolean;
}) {
  const inner = (
    <>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-lg font-black text-white">{fallbackLetter}</span>
      )}
    </>
  );

  const shellClass = cn(
    "grid place-items-center overflow-hidden rounded-[18px] bg-gradient-to-br from-[var(--primary)] to-violet-600 text-white",
    sizeClass,
    interactive &&
      "cursor-pointer ring-offset-2 transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
  );

  if (interactive && onPickClick) {
    return (
      <button
        type="button"
        className={shellClass}
        title={title}
        aria-label={title}
        onClick={onPickClick}
      >
        {inner}
      </button>
    );
  }

  return <div className={shellClass}>{inner}</div>;
}

export function ProfilePage() {
  const { userId } = useParams();
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);
  const stores = useMarketStore((s) => s.stores);
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames);
  const profileSocialLinks = useAppStore((s) => s.profileSocialLinks);
  const setMeAvatarUrl = useAppStore((s) => s.setMeAvatarUrl);
  const setMeName = useAppStore((s) => s.setMeName);
  const setMeEmail = useAppStore((s) => s.setMeEmail);
  const setProfileSocialLink = useAppStore((s) => s.setProfileSocialLink);
  const saved = useAppStore((s) => s.savedReels);

  const isMe = userId === "me" || userId === me.id;
  const resolvedProfileUserId = isMe ? me.id : (userId ?? me.id);

  const safeName = me.name ?? "";
  const safeEmail = me.email ?? "";

  const storesForProfile = useMemo(() => {
    return Object.values(stores).filter((b) => b.ownerUserId === resolvedProfileUserId);
  }, [stores, resolvedProfileUserId]);

  const reelTitles = useMemo(() => reelTitlesById(), []);

  const profileDisplayName =
    isMe ? safeName : (profileDisplayNames[resolvedProfileUserId] ?? `Usuario ${resolvedProfileUserId}`);

  const [tab, setTab] = useState<"account" | "reels" | "stores">("account");
  const [socialModal, setSocialModal] = useState<SocialNetworkId | null>(null);
  const [socialDraft, setSocialDraft] = useState("");
  const [nameDraft, setNameDraft] = useState(safeName);
  const [emailDraft, setEmailDraft] = useState(safeEmail);
  const [avatarDraftUrl, setAvatarDraftUrl] = useState<string | null>(null);
  const avatarDraftRef = useRef<string | null>(null);
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);

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
    if (tab === "stores" && storesForProfile.length === 0 && !isMe)
      setTab("account");
  }, [tab, storesForProfile.length, isMe]);

  const savedIds = useMemo(
    () => Object.keys(saved).filter((id) => saved[id]),
    [saved],
  );

  function openSocialModal(net: SocialNetworkId) {
    setSocialDraft(profileSocialLinks[net] ?? "");
    setSocialModal(net);
  }

  function onProfileAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const picked = input.files ? Array.from(input.files) : [];
    input.value = "";
    const file = picked[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elegí un archivo de imagen.");
      return;
    }
    setAvatarDraftUrl((prev) => {
      revokeBlobUrlLocal(prev);
      return URL.createObjectURL(file);
    });
    toast.success("Revisá la imagen y tocá Guardar para confirmar.");
  }

  function saveProfileAvatar() {
    if (!avatarDraftUrl) return;
    setMeAvatarUrl(avatarDraftUrl);
    avatarDraftRef.current = null;
    setAvatarDraftUrl(null);
    toast.success("Foto de perfil guardada");
  }

  function discardProfileAvatarDraft() {
    setAvatarDraftUrl((prev) => {
      revokeBlobUrlLocal(prev);
      return null;
    });
  }

  const letter = (isMe ? safeName : (userId ?? "U")).slice(0, 1).toUpperCase() || "?";

  const nameDirty = isMe && nameDraft.trim() !== safeName.trim();
  const emailDirty =
    isMe &&
    emailDraft.trim().toLowerCase() !== safeEmail.trim().toLowerCase();
  const profileAvatarDirty = isMe && avatarDraftUrl !== null;
  const profileAvatarDisplayUrl = avatarDraftUrl ?? me.avatarUrl;

  function saveDisplayName() {
    const t = nameDraft.trim();
    if (t.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    setMeName(t);
    toast.success("Nombre guardado");
  }

  function saveEmailField() {
    const t = emailDraft.trim();
    if (!isValidEmail(t)) {
      toast.error("Ingresá un email válido.");
      return;
    }
    setMeEmail(t);
    toast.success("Email guardado");
  }

  const socialModalMeta = socialModal ? SOCIAL_META[socialModal] : null;

  return (
    <div className="container vt-page">
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="vt-btn z-[2] shrink-0 border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.72)] shadow-[0_10px_25px_rgba(2,6,23,0.18)] backdrop-blur-[10px] hover:bg-[rgba(255,255,255,0.86)]"
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

        <div className="flex gap-2.5">
          <button
            type="button"
            className={cn(
              "flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-black",
              tab === "account" &&
                "border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]",
            )}
            onClick={() => setTab("account")}
          >
            Cuenta
          </button>
          {isMe ?
            <button
              type="button"
              className={cn(
                "flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-black",
                tab === "reels" &&
                  "border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]",
              )}
              onClick={() => setTab("reels")}
            >
              Mis Reels
            </button>
          : null}
          {isMe || storesForProfile.length > 0 ?
            <button
              type="button"
              className={cn(
                "flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-black",
                tab === "stores" &&
                  "border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]",
              )}
              onClick={() => setTab("stores")}
            >
              Tiendas
            </button>
          : null}
        </div>

        {tab === "account" && (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Configuración del usuario</div>
            <div className="vt-divider my-3" />

            {isMe ? (
              <div className="mb-4 flex flex-col items-center gap-3 border-b border-[var(--border)] pb-4 text-center sm:flex-row sm:items-start sm:text-left">
                <UserAvatarBadge
                  avatarUrl={profileAvatarDisplayUrl}
                  fallbackLetter={letter}
                  sizeClass="h-[88px] w-[88px] shrink-0 text-2xl"
                  title="Cambiar foto de perfil"
                  interactive
                  onPickClick={() => profileAvatarInputRef.current?.click()}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                      <ImageIcon size={14} /> Foto de perfil
                    </div>
                    <p className="vt-muted mt-1 max-w-md text-[13px] leading-snug">
                      Elegí una imagen desde tu dispositivo y guardala con el
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
            ) : null}

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                  <User size={14} /> Nombre para mostrar
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
                  defaultValue={me.phone ?? ""}
                  disabled
                />
              </label>

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
                    Elegí una pasarela y añadí credenciales necesarias por
                    pasarela (demo).
                  </div>
                  <button type="button" className="vt-btn">
                    Configurar
                  </button>
                </div>
              )}

              {isMe && (
                <div className="mt-6 flex flex-col gap-2 border-t border-[var(--border)] pt-5">
                  <button
                    type="button"
                    className="vt-btn inline-flex items-center justify-center gap-2 border-[color-mix(in_oklab,var(--bad)_45%,var(--border))] text-[var(--bad)]"
                    onClick={() => {
                      void (async () => {
                        await logoutWebApp();
                        nav("/onboarding/phone", { replace: true });
                        toast.success("Sesión cerrada");
                      })();
                    }}
                  >
                    <LogOut size={16} aria-hidden /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "stores" && (isMe || storesForProfile.length > 0) ?
          <ProfileStoresSection ownerUserId={resolvedProfileUserId} canEdit={isMe} />
        : null}

        {tab === "reels" && (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Guardados</div>
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
                  setProfileSocialLink(socialModal, socialDraft);
                  setSocialModal(null);
                  toast.success("Enlace guardado");
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
