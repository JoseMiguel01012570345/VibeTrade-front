import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, UserCheck, X } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import { resolvePlatformUserByPhone } from '../../../../utils/contacts/contactsApi'
import {
  fetchPublishedTransportServicesForUser,
  summarizeTransportServiceForInvite,
  type PublishedTransportServiceDto,
} from '../../../../utils/market/publishedTransportServicesApi'
import {
  fieldError,
  fieldLabel,
  fieldRootWithInvalid,
  mapBackdropLayerAboveChatRail,
  modalFormBody,
} from '../../styles/formModalStyles'

export type RouteTransportistaPick = {
  telefonoTransportista?: string
  transportInvitedStoreServiceId?: string
  transportInvitedServiceSummary?: string
}

type Props = {
  tramoIndex: number
  value: string | undefined
  transportInvitedStoreServiceId?: string
  transportInvitedServiceSummary?: string
  onChange: (pick: RouteTransportistaPick) => void
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

function ServiceDetail({ s }: { s: PublishedTransportServiceDto }) {
  const photos = Array.isArray(s.photoUrls) ? s.photoUrls.filter((u) => typeof u === 'string' && u.trim()) : []
  return (
    <div className="min-w-0 space-y-2 text-sm">
      <div className="font-extrabold text-[var(--text)]">
        {(s.tipoServicio ?? '').trim() || 'Servicio'}
        {(s.category ?? '').trim() ? (
          <span className="vt-muted ml-2 font-semibold">· {s.category!.trim()}</span>
        ) : null}
      </div>
      {(s.storeName ?? '').trim() ? (
        <div className="text-xs font-semibold text-[var(--muted)]">{(s.storeName ?? '').trim()}</div>
      ) : null}
      {photos.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {photos.slice(0, 6).map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="h-14 w-14 rounded-lg border border-[var(--border)] object-cover"
            />
          ))}
        </div>
      ) : null}
      {(s.descripcion ?? '').trim() ? (
        <p className="leading-snug text-[var(--text)]">{(s.descripcion ?? '').trim()}</p>
      ) : null}
      {(s.incluye ?? '').trim() ? (
        <div>
          <div className="text-[11px] font-bold text-[var(--muted)]">Incluye</div>
          <div className="whitespace-pre-wrap">{(s.incluye ?? '').trim()}</div>
        </div>
      ) : null}
      {(s.noIncluye ?? '').trim() ? (
        <div>
          <div className="text-[11px] font-bold text-[var(--muted)]">No incluye</div>
          <div className="whitespace-pre-wrap">{(s.noIncluye ?? '').trim()}</div>
        </div>
      ) : null}
      {(s.entregables ?? '').trim() ? (
        <div>
          <div className="text-[11px] font-bold text-[var(--muted)]">Entregables</div>
          <div className="whitespace-pre-wrap">{(s.entregables ?? '').trim()}</div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Misma idea que en Contactos: se ingresa un número y, si hay cuenta, se elige el teléfono del perfil
 * y un servicio de transporte publicado (ficha).
 */
export function RouteSheetTransportistaPhoneField({
  tramoIndex,
  value,
  transportInvitedServiceSummary,
  onChange,
  error,
  phoneLocked = false,
  lockedDisplayName,
}: Props) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [pickedLabel, setPickedLabel] = useState<string | null>(null)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerBusy, setPickerBusy] = useState(false)
  const [pickerUserId, setPickerUserId] = useState<string | null>(null)
  const [pickerPhoneLine, setPickerPhoneLine] = useState<string | null>(null)
  const [services, setServices] = useState<PublishedTransportServiceDto[]>([])
  const [selectedSvcId, setSelectedSvcId] = useState<string | null>(null)

  const v = value?.trim()
  const svcSummary = transportInvitedServiceSummary?.trim()

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
      setPickerUserId(u.userId)
      setPickerPhoneLine(line)
      setPickedLabel(u.displayName?.trim() || 'Usuario en la plataforma')
      setDraft('')
      setPickerOpen(true)
      setPickerBusy(true)
      setServices([])
      setSelectedSvcId(null)
      try {
        const list = await fetchPublishedTransportServicesForUser(u.userId)
        setServices(list)
        if (list.length > 0) setSelectedSvcId(list[0]!.id)
      } catch {
        toast.error('No se pudieron cargar los servicios publicados de ese usuario.')
        setServices([])
      } finally {
        setPickerBusy(false)
      }
    } catch (e) {
      toast.error(
        e instanceof Error && e.message ? e.message : 'Ese número no está registrado en la plataforma.',
      )
    } finally {
      setBusy(false)
    }
  }

  function closePicker() {
    setPickerOpen(false)
    setPickerUserId(null)
    setPickerPhoneLine(null)
    setServices([])
    setSelectedSvcId(null)
  }

  function confirmPicker() {
    const line = pickerPhoneLine?.trim()
    const uid = pickerUserId?.trim()
    if (!line || !uid) {
      closePicker()
      return
    }
    if (services.length > 0) {
      const sid = selectedSvcId?.trim()
      const sel = sid ? services.find((x) => x.id === sid) : undefined
      if (!sel) {
        toast.error('Elegí un servicio de la lista.')
        return
      }
      const summary = summarizeTransportServiceForInvite(sel)
      onChange({
        telefonoTransportista: line,
        transportInvitedStoreServiceId: sel.id,
        transportInvitedServiceSummary: summary,
      })
      toast.success('Contacto y servicio guardados en el tramo')
    } else {
      onChange({
        telefonoTransportista: line,
        transportInvitedStoreServiceId: undefined,
        transportInvitedServiceSummary: undefined,
      })
      toast.success('Listo: se usará el número del perfil (sin ficha de servicio)')
    }
    closePicker()
  }

  const selectedService = selectedSvcId ? services.find((x) => x.id === selectedSvcId) : undefined

  return (
    <>
      <label className={fieldRootWithInvalid(!!error)}>
        <span className={fieldLabel}>Teléfono del transportista (este tramo)</span>
        <p className="vt-muted mb-2 text-[11px] leading-snug">
          {phoneLocked
            ? 'Este tramo ya tiene un transportista confirmado en la oferta. El contacto no se puede quitar ni cambiar acá.'
            : 'Buscá por número como en Contactos: la cuenta tiene que existir en VibeTrade. Luego elegí una ficha de servicio publicada (transporte).'}
        </p>
        {phoneLocked && v ? (
          <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2.5">
            <div className="font-semibold text-[var(--text)]">
              {lockedDisplayName?.trim() || pickedLabel || 'Transportista confirmado'}
            </div>
            <div className="vt-muted mt-0.5 font-mono text-[12px] break-all">{v}</div>
            {svcSummary ? (
              <div className="mt-2 text-[12px] leading-snug">
                <span className="font-bold text-[var(--muted)]">Servicio indicado en la hoja: </span>
                {svcSummary}
              </div>
            ) : null}
          </div>
        ) : v ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2.5">
            <div className="min-w-0">
              <div className="font-semibold text-[var(--text)]">{pickedLabel ?? 'Contacto en la hoja'}</div>
              <div className="vt-muted mt-0.5 font-mono text-[12px] break-all">{v}</div>
              {svcSummary ? (
                <div className="mt-2 text-[12px] leading-snug text-[var(--text)]">
                  <span className="font-bold text-[var(--muted)]">Servicio: </span>
                  {svcSummary}
                </div>
              ) : (
                !pickedLabel && (
                  <p className="vt-muted mt-1 text-[11px]">Cargado en la hoja; podés quitar y buscar de nuevo.</p>
                )
              )}
            </div>
            <button
              type="button"
              className="vt-btn vt-btn-ghost vt-btn-sm inline-flex shrink-0"
              onClick={() => {
                onChange({
                  telefonoTransportista: undefined,
                  transportInvitedStoreServiceId: undefined,
                  transportInvitedServiceSummary: undefined,
                })
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

      {pickerOpen ? (
        <>
          <button
            type="button"
            className={cn(mapBackdropLayerAboveChatRail, 'fixed inset-0 border-0 bg-black/45 z-[130]')}
            aria-label="Cerrar"
            onClick={() => !pickerBusy && closePicker()}
          />
          <div
            role="dialog"
            aria-modal
            aria-labelledby={`ruta-tramo-${tramoIndex}-pick-svc-title`}
            className="fixed left-1/2 top-1/2 z-[140] max-h-[min(90vh,720px)] w-[min(96vw,640px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
              <div>
                <h2 id={`ruta-tramo-${tramoIndex}-pick-svc-title`} className="text-base font-black tracking-tight">
                  Elegir servicio de transporte
                </h2>
                <p className="vt-muted mt-0.5 text-[12px] leading-snug">
                  {pickedLabel ? `${pickedLabel} · ` : ''}
                  {pickerPhoneLine ? <span className="font-mono">{pickerPhoneLine}</span> : null}
                </p>
              </div>
              <button
                type="button"
                className="vt-icon-btn shrink-0"
                disabled={pickerBusy}
                onClick={closePicker}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className={cn(modalFormBody, 'max-h-[min(72vh,560px)] overflow-y-auto')}>
              {pickerBusy ? (
                <p className="text-[var(--muted)]">Cargando fichas publicadas…</p>
              ) : services.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    Este usuario no tiene servicios de transporte publicados en una tienda con transporte habilitado.
                    Podés continuar solo con el teléfono del perfil.
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className="vt-btn vt-btn-ghost" onClick={closePicker}>
                      Cancelar
                    </button>
                    <button type="button" className="vt-btn vt-btn-primary" onClick={confirmPicker}>
                      Usar solo el teléfono
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 min-[560px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                  <div className="min-w-0 space-y-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                      Servicios publicados ({services.length})
                    </div>
                    <ul className="max-h-[min(52vh,420px)] space-y-1.5 overflow-y-auto pr-1">
                      {services.map((s) => {
                        const active = s.id === selectedSvcId
                        return (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedSvcId(s.id)}
                              className={cn(
                                'w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                                active
                                  ? 'border-[color-mix(in_oklab,var(--primary)_50%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] font-semibold'
                                  : 'border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] hover:bg-[color-mix(in_oklab,var(--bg)_65%,var(--surface))]',
                              )}
                            >
                              <div className="truncate">{(s.tipoServicio ?? '').trim() || 'Servicio'}</div>
                              <div className="vt-muted truncate text-[11px]">
                                {(s.category ?? '').trim()}
                                {(s.storeName ?? '').trim() ? ` · ${(s.storeName ?? '').trim()}` : ''}
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  <div className="min-h-[200px] rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] p-3">
                    {selectedService ? (
                      <ServiceDetail s={selectedService} />
                    ) : (
                      <p className="text-[var(--muted)] text-sm">Elegí un servicio de la lista.</p>
                    )}
                  </div>
                </div>
              )}
              {!pickerBusy && services.length > 0 ? (
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
                  <button type="button" className="vt-btn vt-btn-ghost" onClick={closePicker}>
                    Cancelar
                  </button>
                  <button type="button" className="vt-btn vt-btn-primary" onClick={confirmPicker}>
                    Confirmar servicio
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
