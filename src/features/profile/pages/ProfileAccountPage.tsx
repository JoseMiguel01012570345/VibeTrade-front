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
import type { SocialNetworkId } from '@features/auth/Dtos/userTypes'
import { formatPhoneForDisplay } from '@features/auth/logic/formatPhoneForDisplay'
import { StoreTrustMini } from '@features/profile/components/trust/StoreTrustMini'
import { TrustBar } from '../components/trust/TrustBar'
import { ThemeToggle } from '@app/widgets/ThemeToggle'
import { UploadBlockingOverlay } from '@shared/components/ui/UploadBlockingOverlay'
import { ImageLightbox } from '@shared/components/media/ImageLightbox'
import { ContactsModal } from '../components/ContactsModal'
import { PaymentGatewayConfigModal } from '../components/PaymentGatewayConfigModal'
import { ProfileButton } from '../components/ProfileButton'
import { ProfileConfirmModal } from '../components/ProfileConfirmModal'
import { ProfileModal } from '../components/ProfileModal'
import { UserAvatarBadge } from '../components/account/UserAvatarBadge'
import { PROFILE_SOCIAL_META } from '@features/profile/logic/profileSocialMeta'
import {
  profileDividerClass,
  profileFieldLabelClass,
  profileInputClass,
  profilePanelClass,
  profileSectionCardClass,
  profileSectionMutedClass,
  profileSectionTitleClass,
} from '@features/profile/logic/profileTabStyles'
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

      <div className={profileSectionCardClass}>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className={profileSectionTitleClass}>Configuración del usuario</div>
          {isMe ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Suspense fallback={null}>
                <UserTrustHistoryButton />
              </Suspense>
            </div>
          ) : null}
        </div>
        <div className={profileDividerClass} />

        {isMe ? (
          <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border)] pb-4">
            <TrustBar />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={profileFieldLabelClass}>
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
                  <div className={profileFieldLabelClass}>
                    <ImageIcon size={14} /> Foto de perfil
                  </div>
                  <p className={`${profileSectionMutedClass} mt-1 max-w-md`}>
                    Elige una imagen desde tu dispositivo y guárdala con el botón
                    (vista previa local con URL blob).
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <ProfileButton
                    variant="primary"
                    size="sm"
                    disabled={!account.profileAvatarDirty}
                    onClick={account.saveProfileAvatar}
                  >
                    <Save size={14} aria-hidden /> Guardar foto
                  </ProfileButton>
                  <ProfileButton
                    variant="ghost"
                    size="sm"
                    disabled={!account.profileAvatarDirty}
                    onClick={account.discardProfileAvatarDraft}
                  >
                    Descartar
                  </ProfileButton>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {isMe ? (
            <label className="flex flex-col gap-2">
              <span className={profileFieldLabelClass}>
                <User size={14} /> Nombre de usuario
              </span>
              <input
                className={profileInputClass}
                value={safeUsername}
                disabled
                readOnly
                autoComplete="username"
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-2">
            <span className={profileFieldLabelClass}>
              <User size={14} /> Nombre
            </span>
            {isMe ? (
              <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-stretch">
                <input
                  className={`${profileInputClass} min-w-0 flex-1`}
                  value={account.nameDraft}
                  onChange={(e) =>
                    account.setNameDraft(e.target.value.slice(0, 100))
                  }
                  autoComplete="name"
                  maxLength={100}
                />
                <ProfileButton
                  variant="primary"
                  size="sm"
                  className="min-[480px]:self-stretch"
                  disabled={!account.nameDirty}
                  onClick={account.saveDisplayName}
                >
                  <Save size={14} aria-hidden /> Guardar
                </ProfileButton>
              </div>
            ) : (
              <input
                className={profileInputClass}
                value={profileDisplayName}
                disabled
                readOnly
              />
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className={profileFieldLabelClass}>
              <Mail size={14} /> Email (obligatorio)
            </span>
            {isMe ? (
              <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-stretch">
                <input
                  className={`${profileInputClass} min-w-0 flex-1`}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={account.emailDraft}
                  onChange={(e) =>
                    account.setEmailDraft(e.target.value.slice(0, 120))
                  }
                  maxLength={120}
                />
                <ProfileButton
                  variant="primary"
                  size="sm"
                  className="min-[480px]:self-stretch"
                  disabled={!account.emailDirty}
                  onClick={account.saveEmailField}
                >
                  <Save size={14} aria-hidden /> Guardar
                </ProfileButton>
              </div>
            ) : (
              <input className={profileInputClass} value="—" disabled readOnly />
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className={profileFieldLabelClass}>
              <Phone size={14} /> Teléfono (obligatorio)
            </span>
            <input
              className={profileInputClass}
              value={isMe ? formatPhoneForDisplay(account.me.phone) : '—'}
              disabled
              readOnly
            />
          </label>

          {isMe ? (
            <div className="flex flex-col gap-2">
              <div className={profileFieldLabelClass}>
                <Users size={14} /> Agenda en la plataforma
              </div>
              <p className={`${profileSectionMutedClass} max-w-md`}>
                Guarda números de otros usuarios registrados para verlos con
                nombre y teléfono del perfil.
              </p>
              <ProfileButton
                variant="secondary"
                className="w-fit"
                onClick={() => account.setContactsModalOpen(true)}
              >
                <Users size={16} aria-hidden /> Contactos
              </ProfileButton>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <div className={profileFieldLabelClass}>
              <ExternalLink size={14} /> Multi-cuenta (Instagram / Telegram / X)
            </div>
            <div className="flex flex-wrap gap-2">
              <ProfileButton
                variant="secondary"
                size="sm"
                disabled={!isMe}
                onClick={() => isMe && account.openSocialModal('instagram')}
              >
                <Camera size={16} aria-hidden /> Instagram
              </ProfileButton>
              <ProfileButton
                variant="secondary"
                size="sm"
                disabled={!isMe}
                onClick={() => isMe && account.openSocialModal('telegram')}
              >
                <Send size={16} aria-hidden /> Telegram
              </ProfileButton>
              <ProfileButton
                variant="secondary"
                size="sm"
                disabled={!isMe}
                onClick={() => isMe && account.openSocialModal('x')}
              >
                Conectar X
              </ProfileButton>
            </div>
            {isMe &&
            (account.profileSocialLinks.instagram ||
              account.profileSocialLinks.telegram ||
              account.profileSocialLinks.x) ? (
              <div className={profilePanelClass}>
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
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2"
                        >
                          <span className="font-bold text-[var(--text)]">
                            {PROFILE_SOCIAL_META[id].short}
                          </span>
                          <span
                            className={`${profileSectionMutedClass} min-w-0 flex-1 truncate text-right font-mono text-[12px]`}
                            title={v}
                          >
                            {v}
                          </span>
                          <ProfileButton
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={() => account.openSocialModal(id)}
                          >
                            Editar
                          </ProfileButton>
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
              <div className={profileFieldLabelClass}>
                <CreditCard size={14} /> Configurar tarjetas de pago (solo
                propietario)
              </div>
              <div className={profileSectionMutedClass}>
                Elige una pasarela y añade credenciales necesarias por pasarela
                (demo).
              </div>
              <ProfileButton
                variant="secondary"
                className="w-fit"
                onClick={() => account.setPaymentConfigOpen(true)}
              >
                Configurar
              </ProfileButton>
            </div>
          ) : null}

          {isMe ? (
            <div className="mt-6 flex flex-col gap-2 border-t border-[var(--border)] pt-5">
              <ProfileButton
                variant="danger"
                className="w-full"
                onClick={() => account.setLogoutConfirmOpen(true)}
              >
                <LogOut size={16} aria-hidden /> Cerrar sesión
              </ProfileButton>
            </div>
          ) : null}
        </div>
      </div>

      <ContactsModal
        open={account.contactsModalOpen}
        onClose={() => account.setContactsModalOpen(false)}
      />

      <ProfileModal
        show={account.socialModal !== null && account.socialModalMeta !== null}
        onClose={() => account.setSocialModal(null)}
        title={account.socialModalMeta?.title ?? ""}
        size="lg"
        footer={
          <>
            <ProfileButton
              variant="secondary"
              onClick={() => account.setSocialModal(null)}
            >
              Cancelar
            </ProfileButton>
            <ProfileButton
              variant="primary"
              onClick={() => void account.saveSocialFromModal()}
            >
              Guardar
            </ProfileButton>
          </>
        }
      >
        {account.socialModalMeta ? (
          <>
            <p className={`${profileSectionMutedClass} mb-4`}>
              {account.socialModalMeta.hint}
            </p>
            <label className="flex flex-col gap-2">
              <span className={profileFieldLabelClass}>Usuario o enlace</span>
              <input
                className={profileInputClass}
                autoFocus
                placeholder={account.socialModalMeta.placeholder}
                value={account.socialDraft}
                onChange={(e) => account.setSocialDraft(e.target.value)}
              />
            </label>
          </>
        ) : null}
      </ProfileModal>

      <ProfileConfirmModal
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
