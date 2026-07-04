import { normStoreName } from './marketSliceHelpers'
import type { StoreBadge } from './marketStoreTypes'

/**
 * La URL pública de una tienda es `{base}/{nombre}` (nombre exacto, codificado).
 * Estos helpers construyen esas rutas y validan que un nombre sea usable como
 * segmento de URL sin chocar con las rutas propias de la app.
 */

/**
 * Rutas de primer nivel de la app: una tienda no puede llamarse igual (su URL
 * quedaría eclipsada por la ruta estática y sería inalcanzable). React Router
 * empareja sin distinguir mayúsculas, por eso comparamos con el nombre normalizado.
 */
const RESERVED_STORE_NAMES = new Set<string>([
  'home',
  'cart',
  'checkout',
  'search',
  'stores',
  'store',
  'offer',
  'offers',
  'chat',
  'reels',
  'profile',
  'notifications',
  'notification',
  'onboarding',
  'mis-compras',
  'mensualidad',
  'admin',
  'estadisticas',
  'afiliado',
  'afiliados',
  'finanzas',
  'almacen',
  'almacenes',
  'pedido',
  'pedidos',
  'rastreo',
  'invite',
  'staff-login',
  'login',
  'logout',
  'api',
  'panel',
  'mapa',
])

/** Caracteres que romperían el segmento de URL de la tienda (aun codificados dan problemas). */
const INVALID_STORE_NAME_CHARS = /[/\\?#%]/

export function isReservedStoreName(name: string): boolean {
  return RESERVED_STORE_NAMES.has(normStoreName(name))
}

export function hasInvalidStoreNameChars(name: string): boolean {
  return INVALID_STORE_NAME_CHARS.test(name)
}

/**
 * Motivo por el que un nombre no puede usarse como URL de tienda, o `null` si es válido.
 * Se usa al crear/renombrar la tienda para dar un mensaje claro.
 */
export function storeNameUrlIssue(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Indica el nombre de la tienda.'
  if (hasInvalidStoreNameChars(trimmed))
    return 'El nombre no puede contener / \\ ? # ni %.'
  if (isReservedStoreName(trimmed))
    return 'Ese nombre está reservado por la aplicación. Elige otro.'
  return null
}

/** URL pública de la tienda a partir del nombre exacto (codificado). */
export function storePathFromName(name: string): string {
  return `/${encodeURIComponent(name.trim())}`
}

/**
 * URL pública de la tienda a partir de un badge (usa el nombre; cae a `/store/:id`
 * solo si por alguna razón no hay nombre, para que la redirección legada resuelva).
 */
export function storeHref(
  store: Pick<StoreBadge, 'id' | 'name'> | null | undefined,
): string {
  const name = store?.name?.trim()
  if (name) return storePathFromName(name)
  const id = store?.id?.trim()
  return id ? `/store/${encodeURIComponent(id)}` : '/home'
}

/** URL del panel de administración de la tienda por nombre. */
export function storePanelHref(
  store: Pick<StoreBadge, 'id' | 'name'> | null | undefined,
  section?: string,
): string {
  const base = `${storeHref(store)}/panel`
  return section ? `${base}/${section}` : base
}

/** URL del mapa de ubicación de la tienda por nombre. */
export function storeMapHref(
  store: Pick<StoreBadge, 'id' | 'name'> | null | undefined,
): string {
  return `${storeHref(store)}/mapa`
}

/**
 * URL del detalle de un producto dentro de la tienda: `{base}/{nombre}/{productId}`.
 * Si no hay nombre de tienda (contexto sin tienda), cae a la ruta global `/offer/:id`.
 */
export function storeProductHref(
  store: Pick<StoreBadge, 'id' | 'name'> | null | undefined,
  productId: string,
): string {
  const id = encodeURIComponent(productId.trim())
  const name = store?.name?.trim()
  if (name) return `${storePathFromName(name)}/${id}`
  return `/offer/${id}`
}

/** Carrito dentro de la tienda: `{base}/{nombre}/cart` (cae a `/cart` sin nombre). */
export function storeCartHref(
  store: Pick<StoreBadge, 'id' | 'name'> | null | undefined,
): string {
  const name = store?.name?.trim()
  return name ? `${storePathFromName(name)}/cart` : '/cart'
}

/** Checkout dentro de la tienda: `{base}/{nombre}/checkout` (cae a `/checkout` sin nombre). */
export function storeCheckoutHref(
  store: Pick<StoreBadge, 'id' | 'name'> | null | undefined,
): string {
  const name = store?.name?.trim()
  return name ? `${storePathFromName(name)}/checkout` : '/checkout'
}

/**
 * Buscador de rastreo dentro de la tienda: `{base}/{nombre}/rastreo` (conserva el cintillo
 * de la tienda). Cae a la ruta global `/rastreo` cuando no hay nombre de tienda.
 */
export function storeTrackingHref(
  store: Pick<StoreBadge, 'id' | 'name'> | null | undefined,
): string {
  const name = store?.name?.trim()
  return name ? `${storePathFromName(name)}/rastreo` : '/rastreo'
}

/** Busca en el estado una tienda cuyo nombre normalizado coincida con `normalized`. */
export function findStoreByNormalizedName(
  stores: Record<string, StoreBadge>,
  normalized: string,
): StoreBadge | undefined {
  if (!normalized) return undefined
  return Object.values(stores).find((s) => normStoreName(s.name) === normalized)
}
