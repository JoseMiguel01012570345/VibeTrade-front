import type { OwnerStoreFormValues } from '../../app/store/marketStoreTypes'
import { formServiceQualifiesAsTransport } from '../../utils/user/transportEligibility'
import { normalizeOwnerWebsiteUrl } from '../../utils/websiteUrl'
import {
  catalogMonedasList,
  type StoreCustomField,
  type StoreProduct,
  type StoreService,
} from '../chat/domain/storeCatalogTypes'

export const PROFILE_TITLE_MIN = 2
export const PROFILE_DESC_MIN = 1
/** Mínimo para textos cortos tipo «no aplica» o notas. */
export const PROFILE_LINE_MIN = 3

const TITLE_MIN = PROFILE_TITLE_MIN
const DESC_MIN = PROFILE_DESC_MIN
const LINE_MIN = PROFILE_LINE_MIN

function norm(s: string): string {
  return s.trim()
}

function validateCustomFields(fields: StoreCustomField[]): string | null {
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]
    const t = norm(f.title)
    const b = norm(f.body)
    if (t.length < TITLE_MIN) {
      return `Campo adicional ${i + 1}: el título debe tener al menos ${TITLE_MIN} caracteres.`
    }
    if (b.length < DESC_MIN) {
      return `Campo adicional ${i + 1}: el texto embebido debe tener al menos ${DESC_MIN} caracteres.`
    }
  }
  return null
}

export function validateOwnerStoreForm(values: OwnerStoreFormValues): string | null {
  if (!norm(values.name)) return 'Indica el nombre de la tienda.'
  if (!values.categories?.length || !values.categories.some((c) => norm(c).length >= TITLE_MIN)) {
    return 'Indica al menos una categoría (texto significativo).'
  }
  if (norm(values.categoryPitch).length < DESC_MIN) {
    return `La descripción de categorías del catálogo debe tener al menos ${DESC_MIN} caracteres.`
  }
  const w = norm(values.websiteUrl ?? '')
  if (w && !normalizeOwnerWebsiteUrl(values.websiteUrl)) {
    return 'La URL del sitio no es válida (ej.: https://mitienda.com o el dominio sin esquema).'
  }
  return null
}

export type ProductFormSnapshot = Omit<StoreProduct, 'id' | 'storeId'>

export function validateProductForm(form: ProductFormSnapshot): string | null {
  if (norm(form.category).length < TITLE_MIN) return 'Completa la categoría.'
  if (norm(form.name).length < TITLE_MIN) return 'Completa el nombre del producto.'
  if (!norm(form.price)) return 'Completa el precio.'
  if (!norm(form.monedaPrecio ?? '')) {
    return 'Elige la moneda del precio (tipo de moneda).'
  }
  if (catalogMonedasList(form).length < 1) {
    return 'Indica al menos una moneda aceptada para el pago.'
  }
  if (norm(form.shortDescription).length < DESC_MIN) return `La descripción breve debe tener al menos ${DESC_MIN} caracteres.`
  if (norm(form.mainBenefit).length < DESC_MIN) return `El beneficio principal debe tener al menos ${DESC_MIN} caracteres.`
  if (norm(form.technicalSpecs).length < DESC_MIN) return `Las características técnicas deben tener al menos ${DESC_MIN} caracteres.`
  if (norm(form.taxesShippingInstall ?? '').length < LINE_MIN) {
    return 'Indica impuestos, envío o instalación (puedes escribir «No aplica» si corresponde).'
  }
  if (norm(form.availability).length < DESC_MIN) return `La disponibilidad debe tener al menos ${DESC_MIN} caracteres.`
  if (norm(form.warrantyReturn).length < DESC_MIN) return `Garantía y devolución: al menos ${DESC_MIN} caracteres.`
  if (norm(form.contentIncluded).length < DESC_MIN) return `Contenido incluido: al menos ${DESC_MIN} caracteres.`
  if (norm(form.usageConditions).length < DESC_MIN) return `Condiciones de uso: al menos ${DESC_MIN} caracteres.`
  if (!form.photoUrls?.length || !form.photoUrls.some((u) => norm(u))) {
    return 'Sube al menos una foto del producto (imagen desde tu dispositivo).'
  }

  const customErr = validateCustomFields(form.customFields)
  if (customErr) return customErr

  return null
}

export type ServiceFormSnapshot = Omit<StoreService, 'id' | 'storeId'>

export function validateServiceForm(
  form: ServiceFormSnapshot,
  riesgosLines: string[],
  dependenciasLines: string[],
): string | null {
  if (norm(form.category).length < TITLE_MIN) return 'Completa la categoría.'
  if (norm(form.tipoServicio).length < TITLE_MIN) return 'Completa el tipo de servicio.'
  if (catalogMonedasList(form).length < 1) {
    return 'Indica al menos una moneda aceptada para el pago.'
  }
  if (norm(form.descripcion).length < DESC_MIN) return `La descripción del servicio debe tener al menos ${DESC_MIN} caracteres.`

  if (form.riesgos.enabled) {
    const items = riesgosLines.map((l) => l.trim()).filter(Boolean)
    if (items.length < 1) return 'Activaste riesgos: añade al menos una descripción (una línea por riesgo).'
    if (items.some((l) => l.length < LINE_MIN)) return 'Cada riesgo debe tener al menos 3 caracteres útiles.'
  }

  if (norm(form.incluye).length < DESC_MIN) return `«Qué incluye» debe tener al menos ${DESC_MIN} caracteres.`
  if (norm(form.noIncluye).length < DESC_MIN) return `«Qué no incluye» debe tener al menos ${DESC_MIN} caracteres.`

  if (form.dependencias.enabled) {
    const items = dependenciasLines.map((l) => l.trim()).filter(Boolean)
    if (items.length < 1) return 'Activaste dependencias: añade al menos una (una línea por ítem).'
    if (items.some((l) => l.length < LINE_MIN)) return 'Cada dependencia debe tener al menos 3 caracteres útiles.'
  }

  if (norm(form.entregables).length < DESC_MIN) return `«Qué se entrega» debe tener al menos ${DESC_MIN} caracteres.`

  if (form.garantias.enabled) {
    if (norm(form.garantias.texto).length < DESC_MIN) return 'Activaste garantías: completa el texto (mín. caracteres).'
  }

  if (norm(form.propIntelectual).length < DESC_MIN) {
    return `Propiedad intelectual: al menos ${DESC_MIN} caracteres (quién es dueño, reutilización, licencias).`
  }

  const customErr = validateCustomFields(form.customFields)
  if (customErr) return customErr

  const photoUrls = form.photoUrls?.map(norm).filter(Boolean) ?? []
  if (formServiceQualifiesAsTransport(form) && photoUrls.length < 1) {
    return 'Los servicios de transporte o logística requieren al menos una foto (subí una imagen desde tu dispositivo).'
  }

  return null
}
