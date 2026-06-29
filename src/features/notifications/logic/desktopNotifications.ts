/**
 * Notificaciones nativas del SO (Web Notifications API).
 * Solo se muestran cuando la ventana o pestaña no está enfocada / está oculta.
 */

/** Preferencia del usuario (localStorage); por defecto activada. */
export const DESKTOP_NOTIFICATIONS_PREF_STORAGE_KEY =
  'vt_desktop_notifications_enabled'

export function getDesktopNotificationsEnabledPreference(): boolean {
  if (typeof localStorage === 'undefined') return true
  const v = localStorage.getItem(DESKTOP_NOTIFICATIONS_PREF_STORAGE_KEY)
  if (v === null) return true
  return v === '1' || v === 'true'
}

export function setDesktopNotificationsEnabledPreference(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(
    DESKTOP_NOTIFICATIONS_PREF_STORAGE_KEY,
    enabled ? '1' : '0',
  )
}

export function isDesktopNotificationSupported(): boolean {
  return typeof globalThis !== 'undefined' && 'Notification' in globalThis
}

export function getDesktopNotificationPermission(): NotificationPermission {
  if (!isDesktopNotificationSupported()) return 'denied'
  return Notification.permission
}

/** Debe llamarse desde un gesto del usuario (p. ej. clic en "Activar"). */
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!isDesktopNotificationSupported()) return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** True si conviene mostrar aviso fuera del navegador (otra app o pestaña activa). */
export function shouldShowDesktopNotificationBecauseUnfocused(): boolean {
  if (typeof document === 'undefined') return false
  if (document.visibilityState === 'hidden') return true
  try {
    return !document.hasFocus()
  } catch {
    return document.visibilityState !== 'visible'
  }
}

export type DesktopNotifyPayload = {
  title: string
  body: string
  /** Evita duplicados: el SO reemplaza notificaciones con el mismo tag. */
  tag: string
  /** Si se indica, al hacer clic se navega en la misma pestaña. */
  navigateTo?: string | null
}

export function notifyDesktopIfUnfocused(payload: DesktopNotifyPayload): void {
  if (!isDesktopNotificationSupported()) return
  if (!getDesktopNotificationsEnabledPreference()) return
  if (Notification.permission !== 'granted') return
  if (!shouldShowDesktopNotificationBecauseUnfocused()) return

  const title = payload.title.trim().slice(0, 120) || 'VibeTrade'
  const body = payload.body.trim().slice(0, 500) || ''

  let n: Notification
  try {
    n = new Notification(title, {
      body,
      tag: payload.tag.slice(0, 64),
    })
  } catch {
    return
  }

  n.onclick = () => {
    try {
      n.close()
    } catch {
      /* noop */
    }
    try {
      globalThis.focus?.()
    } catch {
      /* noop */
    }
    const path = payload.navigateTo?.trim()
    if (path && path.startsWith('/') && typeof window !== 'undefined') {
      window.location.assign(path)
    }
  }
}
