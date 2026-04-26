import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, UserCheck } from 'lucide-react'
import { resolvePlatformUserByPhone } from '../../../../utils/contacts/contactsApi'
import { fieldError, fieldLabel, fieldRootWithInvalid } from '../../styles/formModalStyles'

type Props = {
  tramoIndex: number
  value: string | undefined
  onChange: (phone: string | undefined) => void
  error?: string
  /** Suscripción aceptada: no se puede quitar ni reemplazar el contacto desde el formulario. */
  phoneLocked?: boolean
  /** Nombre del transportista confirmado (oferta pública). */
  lockedDisplayName?: string
}

function phoneLineFromResolved(phoneDisplay: string | null, phoneDigits: string | null, fallback: string) {
  const d = phoneDisplay?.trim()
  if (d) return d
  const dig = phoneDigits?.trim()
  if (dig) return `+${dig}`
  return fallback
}

/**
 * Misma idea que en Contactos: se ingresa un número y, si hay cuenta, se elige el teléfono del perfil.
 */
export function RouteSheetTransportistaPhoneField({
  tramoIndex,
  value,
  onChange,
  error,
  phoneLocked = false,
  lockedDisplayName,
}: Props) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [pickedLabel, setPickedLabel] = useState<string | null>(null)

  const v = value?.trim()

  useEffect(() => {
    if (!v) setPickedLabel(null)
  }, [v])

  async function onSearch() {
    const raw = draft.trim()
    if (!raw) {
      toast.error('Ingresá un número de teléfono.')
      return
    }
    setBusy(true)
    try {
      const u = await resolvePlatformUserByPhone(raw)
      const line = phoneLineFromResolved(u.phoneDisplay, u.phoneDigits, raw)
      onChange(line)
      setPickedLabel(u.displayName?.trim() || 'Usuario en la plataforma')
      setDraft('')
      toast.success('Listo: se usará el número del perfil')
    } catch (e) {
      toast.error(
        e instanceof Error && e.message ? e.message : 'Ese número no está registrado en la plataforma.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <label className={fieldRootWithInvalid(!!error)}>
      <span className={fieldLabel}>Teléfono del transportista (este tramo)</span>
      <p className="vt-muted mb-2 text-[11px] leading-snug">
        {phoneLocked
          ? 'Este tramo ya tiene un transportista confirmado en la oferta. El contacto no se puede quitar ni cambiar acá.'
          : 'Buscá por número como en Contactos: la cuenta tiene que existir en VibeTrade. Se guarda el teléfono del perfil.'}
      </p>
      {phoneLocked && v ? (
        <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2.5">
          <div className="font-semibold text-[var(--text)]">
            {lockedDisplayName?.trim() || pickedLabel || 'Transportista confirmado'}
          </div>
          <div className="vt-muted mt-0.5 font-mono text-[12px] break-all">{v}</div>
        </div>
      ) : v ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2.5">
          <div className="min-w-0">
            <div className="font-semibold text-[var(--text)]">{pickedLabel ?? '—'}</div>
            <div className="vt-muted mt-0.5 font-mono text-[12px] break-all">{v}</div>
            {!pickedLabel && (
              <p className="vt-muted mt-1 text-[11px]">Cargado en la hoja; podés quitar y buscar de nuevo.</p>
            )}
          </div>
          <button
            type="button"
            className="vt-btn vt-btn-ghost vt-btn-sm inline-flex shrink-0"
            onClick={() => {
              onChange(undefined)
              setPickedLabel(null)
            }}
          >
            Quitar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input
            id={`ruta-tramo-${tramoIndex}-tel`}
            className="vt-input min-w-0 flex-1"
            type="tel"
            autoComplete="tel"
            placeholder="Ej. +54 9 11 1234-5678"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy || phoneLocked}
            aria-invalid={!!error}
          />
          <button
            type="button"
            className="vt-btn vt-btn-primary inline-flex shrink-0 items-center justify-center gap-2"
            disabled={busy || phoneLocked}
            onClick={() => void onSearch()}
          >
            {busy ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <UserCheck size={16} aria-hidden />}
            Buscar y elegir
          </button>
        </div>
      )}
      {error ? (
        <span className={fieldError} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
