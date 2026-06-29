import { lazy, Suspense } from 'react'
import {
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
} from 'lucide-react'
import type { SocialNetworkId } from '@features/auth/store/useAppStore'
import { formatPhoneForDisplay } from '@features/auth/lib/formatPhoneForDisplay'
import { StoreTrustMini } from '@features/profile/components/trust/StoreTrustMini'
import { TrustBar } from '../components/trust/TrustBar'
import { ThemeToggle } from '@app/widgets/ThemeToggle'
import { onBackdropPointerClose } from '@shared/lib/modals/modalClose'
import {
  fieldLabel,
  modalFormBody,
  modalShellWide,
  modalSub,
} from '@shared/styles/modals/formModalStyles'
import { ConfirmModal } from '@shared/components/ui/ConfirmModal'
import { UploadBlockingOverlay } from '@shared/components/ui/UploadBlockingOverlay'
import { ImageLightbox } from '@shared/components/media/ImageLightbox'
import { ContactsModal } from '../components/ContactsModal'
import { PaymentGatewayConfigModal } from '../components/PaymentGatewayConfigModal'
import { UserAvatarBadge } from '../components/account/UserAvatarBadge'
import { PROFILE_SOCIAL_META } from '../components/account/profileSocialMeta'
import { useProfileAccountSection } from '../hooks/useProfileAccountSection'
import type { ProfileVisitorPublic } from '../Dtos/profileVisitorPublic'

const UserTrustHistoryButton = lazy(async () => {
  const m = await import('../components/trust/UserTrustHistoryButton')
  return { default: m.UserTrustHistoryButton }
})

type Props = {
  isMe: boolean
  safeName: string
  safeEmail: string
  safeUsername: string
  profileDisplayName: string
  letter: string
  visitorPublic: ProfileVisitorPublic
  visitorPublicStatus: 'idle' | 'loading' | 'ready' | 'error'
  visitorAvatarDisplay?: string
  searchParams: URLSearchParams
  setSearchParams: (
    next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    opts?: { replace?: boolean },
  ) => void
}

export function ProfileAccountPage({
  isMe,
  safeName,
  safeEmail,
  safeUsername,
  profileDisplayName,
  letter,
  visitorPublic,
  visitorPublicStatus,
  visitorAvatarDisplay,
  searchParams,
  setSearchParams,
}: Props) {
  const account = useProfileAccountSection({
    isMe,
    safeName,
    safeEmail,
    searchParams,
    setSearchParams,
  })

  return (
    <>
      <UploadBlockingOverlay
        active={account.profileUploadBusy}
        message="Procesando imagen…"
      />
      <input
        ref={account.profileAvatarInputRef}
        type="file"
        className="sr-only"
        accept="image/*"
        aria-label="Subir foto de perfil"
        onChange={account.onProfileAvatarChange}
      />

      <div className="vt-card vt-card-pad">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="vt-h2">Configuración del usuario</div>
          {isMe ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Suspense fallback={null}>
                <UserTrustHistoryButton />
              </Suspense>
            </div>
          ) : null}
        </div>
        <div className="vt-divider my-3" />

        {isMe ? (
          <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border)] pb-4">
            <TrustBar />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-black text-[var(--muted)]">
                Apariencia (modo claro / oscuro)
              </span>
              <ThemeToggle />
            </div>
          </div>
        ) : null}

        {!isMe ? (
          <div className="mb-4 flex flex-col items-center gap-3 border-b border-[var(--border)] pb-4 text-center sm:flex-row sm:items-start sm:text-left">
            <UserAvatarBadge
              avatarUrl={visitorAvatarDisplay}
              fallbackLetter={letter}
              sizeClass="h-[88px] w-[88px] shrink-0 text-2xl"
              title="Foto de perfil"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {visitorPublicStatus === 'loading' ||
              visitorPublicStatus === 'idle' ? (
                <div className="text-sm text-[var(--muted)]">
                  Cargando perfil…
                </div>
              ) : visitorPublic != null ? (
                <StoreTrustMini
                  score={visitorPublic.trustScore}
                  ariaLabel="Confianza del usuario"
                />
              ) : visitorPublicStatus === 'error' ? (
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
                avatarUrl={account.profileAvatarDisplayUrl}
                fallbackLetter={letter}
                sizeClass="h-[88px] w-[88px] shrink-0 text-2xl"
                title="Elegir foto de perfil"
                interactive
                onPickClick={() =>
                  account.profileAvatarInputRef.current?.click()
                }
                onPreviewClick={() =>
                  account.setAvatarPreviewUrl(
                    account.profileAvatarDisplayUrl ?? null,
                  )
                }
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                    <ImageIcon size={14} /> Foto de perfil
                  </div>
                  <p className="vt-muted mt-1 max-w-md text-[13px] leading-snug">
                    Elige una imagen desde tu dispositivo y guárdala con el botón
                    (vista previa local con URL blob).
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <button
                    type="button"
                    className="vt-btn vt-btn-primary vt-btn-sm inline-flex items-center gap-1.5"
                    disabled={!account.profileAvatarDirty}
                    onClick={account.saveProfileAvatar}
                  >
                    <Save size={14} aria-hidden /> Guardar foto
                  </button>
                  <button
                    type="button"
                    className="vt-btn vt-btn-ghost vt-btn-sm"
                    disabled={!account.profileAvatarDirty}
                    onClick={account.discardProfileAvatarDraft}
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {isMe ? (
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                <User size={14} /> Nombre de usuario
              </span>
              <input
                className="vt-input"
                value={safeUsername}
                disabled
                readOnly
                autoComplete="username"
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
              <User size={14} /> Nombre
            </span>
            {isMe ? (
              <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-stretch">
                <input
                  className="vt-input min-w-0 flex-1"
                  value={account.nameDraft}
                  onChange={(e) =>
                    account.setNameDraft(e.target.value.slice(0, 100))
                  }
                  autoComplete="name"
                  maxLength={100}
                />
                <button
                  type="button"
                  className="vt-btn vt-btn-primary vt-btn-sm inline-flex shrink-0 items-center justify-center gap-1.5 min-[480px]:self-stretch"
                  disabled={!account.nameDirty}
                  onClick={account.saveDisplayName}
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
                  value={account.emailDraft}
                  onChange={(e) =>
                    account.setEmailDraft(e.target.value.slice(0, 120))
                  }
                  maxLength={120}
                />
                <button
                  type="button"
                  className="vt-btn vt-btn-primary vt-btn-sm inline-flex shrink-0 items-center justify-center gap-1.5 min-[480px]:self-stretch"
                  disabled={!account.emailDirty}
                  onClick={account.saveEmailField}
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
              value={isMe ? formatPhoneForDisplay(account.me.phone) : '—'}
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
                onClick={() => account.setContactsModalOpen(true)}
              >
                <Users size={16} aria-hidden /> Contactos
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
              <ExternalLink size={14} /> Multi-cuenta (Instagram / Telegram / X)
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                className="vt-btn"
                disabled={!isMe}
                onClick={() => isMe && account.openSocialModal('instagram')}
              >
                <Camera size={16} aria-hidden /> Conectar Instagram
              </button>
              <button
                type="button"
                className="vt-btn"
                disabled={!isMe}
                onClick={() => isMe && account.openSocialModal('telegram')}
              >
                <Send size={16} aria-hidden /> Conectar Telegram
              </button>
              <button
                type="button"
                className="vt-btn"
                disabled={!isMe}
                onClick={() => isMe && account.openSocialModal('x')}
              >
                Conectar X
              </button>
            </div>
            {isMe &&
            (account.profileSocialLinks.instagram ||
              account.profileSocialLinks.telegram ||
              account.profileSocialLinks.x) ? (
              <div className="mt-1 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Cuentas guardadas
                </div>
                <ul className="mt-2 space-y-2 text-[13px]">
                  {(['instagram', 'telegram', 'x'] as SocialNetworkId[]).map(
                    (id) => {
                      const v = account.profileSocialLinks[id]
                      if (!v) return null
                      return (
                        <li
                          key={id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2"
                        >
                          <span className="font-bold text-[var(--text)]">
                            {PROFILE_SOCIAL_META[id].short}
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
                            onClick={() => account.openSocialModal(id)}
                          >
                            Editar
                          </button>
                        </li>
                      )
                    },
                  )}
                </ul>
              </div>
            ) : null}
          </div>

          {isMe ? (
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                <CreditCard size={14} /> Configurar tarjetas de pago (solo
                propietario)
              </div>
              <div className="vt-muted">
                Elige una pasarela y añade credenciales necesarias por pasarela
                (demo).
              </div>
              <button
                type="button"
                className="vt-btn"
                onClick={() => account.setPaymentConfigOpen(true)}
              >
                Configurar
              </button>
            </div>
          ) : null}

          {isMe ? (
            <div className="mt-6 flex flex-col gap-2 border-t border-[var(--border)] pt-5">
              <button
                type="button"
                className="vt-btn inline-flex items-center justify-center gap-2 border-[color-mix(in_oklab,var(--bad)_45%,var(--border))] text-[var(--bad)]"
                onClick={() => account.setLogoutConfirmOpen(true)}
              >
                <LogOut size={16} aria-hidden /> Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <ContactsModal
        open={account.contactsModalOpen}
        onClose={() => account.setContactsModalOpen(false)}
      />

      {account.socialModal && account.socialModalMeta ? (
        <div
          className="vt-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-social-modal-title"
          onMouseDown={(e) =>
            onBackdropPointerClose(e, () => account.setSocialModal(null))
          }
        >
          <div
            className={modalShellWide}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="vt-modal-title" id="profile-social-modal-title">
              {account.socialModalMeta.title}
            </div>
            <div className={modalSub}>{account.socialModalMeta.hint}</div>
            <div className={modalFormBody}>
              <label className="flex flex-col gap-2">
                <span className={fieldLabel}>Usuario o enlace</span>
                <input
                  className="vt-input"
                  autoFocus
                  placeholder={account.socialModalMeta.placeholder}
                  value={account.socialDraft}
                  onChange={(e) => account.setSocialDraft(e.target.value)}
                />
              </label>
            </div>
            <div className="vt-modal-actions">
              <button
                type="button"
                className="vt-btn"
                onClick={() => account.setSocialModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="vt-btn vt-btn-primary"
                onClick={() => {
                  void account.saveSocialFromModal()
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={account.logoutConfirmOpen}
        title="¿Cerrar sesión?"
        message="Vas a salir de tu cuenta en este dispositivo. Puedes volver a iniciar sesión cuando quieras."
        cancelLabel="Cancelar"
        confirmLabel="Cerrar sesión"
        confirmBusy={account.logoutBusy}
        onCancel={() => account.setLogoutConfirmOpen(false)}
        onConfirm={() => {
          void account.confirmLogout()
        }}
      />

      <PaymentGatewayConfigModal
        open={account.paymentConfigOpen}
        onClose={() => account.setPaymentConfigOpen(false)}
      />

      <ImageLightbox
        url={account.avatarPreviewUrl}
        onClose={() => account.setAvatarPreviewUrl(null)}
      />
    </>
  )
}
