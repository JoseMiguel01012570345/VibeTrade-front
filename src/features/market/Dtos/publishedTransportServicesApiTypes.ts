/** Ficha de servicio (`StoreServiceCatalogRowView`) + `storeName` desde el endpoint de transporte. */
export type PublishedTransportServiceDto = {
  id: string
  storeId: string
  storeName?: string
  category?: string
  nombreServicio?: string
  descripcion?: string
  incluye?: string
  noIncluye?: string
  entregables?: string
  propIntelectual?: string
  published?: boolean
  photoUrls?: string[]
  fixedPrice?: number
  currencyCode?: string
  customFields?: unknown
  riesgos?: unknown
  dependencias?: unknown
  garantias?: unknown
}
