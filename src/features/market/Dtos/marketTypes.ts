import type {
  OfferQaAuthorSnapshot,
  OfferQaCommentEnriched,
} from "./offerQaTypes";
import type { StoreLocationPoint } from "@shared/Dtos/storeLocationPoint";

export type { StoreLocationPoint } from "@shared/Dtos/storeLocationPoint";

export type StoreBadge = {
  id: string;
  name: string;
  verified: boolean;
  categories: string[];
  transportIncluded: boolean;
  avatarUrl?: string;
  trustScore: number;
  /** Descripción corta del catálogo (pitch), alineada con `StoreRow.Pitch` / catálogo. */
  pitch?: string;
  /** Si existe, la tienda fue creada desde el perfil y solo ese usuario puede editarla. */
  ownerUserId?: string;
  /** Ubicación opcional mostrada en la ficha pública de la tienda. */
  location?: StoreLocationPoint;
  /** Sitio web público (https), opcional. */
  websiteUrl?: string;
  /** Tarifa de mensajería por km configurada por la tienda (checkout y tramos, wiki cap. 06). */
  pricePerKm?: number;
  /** Moneda ISO de `pricePerKm`. */
  pricePerKmCurrencyCode?: string;
};

/** Parada en snapshot de publicación emergente; coords opcionales para Leaflet. */
export type EmergentRouteParadaSnapshot = {
  /** Id del tramo en la hoja persistida (API `stopId`); requerido para suscripción en servidor. */
  stopId?: string;
  /** Orden del tramo en la hoja (API `orden`). */
  orden?: number;
  origen: string;
  destino: string;
  origenLat?: string;
  origenLng?: string;
  destinoLat?: string;
  destinoLng?: string;
  /** Moneda del precio de este tramo (API `emergentRouteParadas[].monedaPago`). */
  monedaPago?: string;
  /** Tarifa / precio del transportista en este tramo (`precioTransportista` en API). */
  precioTransportista?: string;
  /** Km por carretera persistidos en la hoja (`osrmRoadKm` en API). */
  osrmRoadKm?: number;
  /** Polilínea OSRM persistida en hoja (`osrmRouteLatLngs` en API). */
  osrmRouteLatLngs?: [number, number][];
};

/**
 * QA fila en el cliente: modelo de dominio enriquecido + campo `question` usado en UI legada
 * (la API persiste `text` / `question` según el flujo).
 */
export type QAItem = OfferQaCommentEnriched & {
  question: string;
  askedBy: OfferQaAuthorSnapshot;
  answeredBy?: OfferQaAuthorSnapshot;
};

export type Offer = {
  id: string;
  storeId: string;
  title: string;
  price: string;
  /** Texto de vitrina: descripción corta (producto) o ficha de servicio. */
  description?: string;
  /**
   * Legado / demo: la ubicación de la oferta ya no viene del API (usar `stores[storeId].location`).
   */
  location?: string | StoreLocationPoint | null;
  tags: string[];
  imageUrl: string;
  /** Galería (mismas URLs que catálogo); la primera suele coincidir con imageUrl. */
  imageUrls?: string[];
  qa?: QAItem[];
  /** Número de comentarios públicos (feed / recomendaciones). */
  publicCommentCount?: number;
  offerLikeCount?: number;
  viewerLikedOffer?: boolean;
  /**
   * Publicación emergente de hoja de ruta (`emo_…`); el `id` es la publicación, no el id de catálogo.
   * Viene de la API de recomendaciones; la imagen del producto sigue en `imageUrl` (oferta base).
   */
  isEmergentRoutePublication?: boolean;
  /** Oferta de catálogo (producto/servicio) asociada a la publicación emergente. */
  emergentBaseOfferId?: string;
  /** Hilo de chat de la operación (API `emergentThreadId`). */
  emergentThreadId?: string;
  /** Hoja de ruta persistida (API `emergentRouteSheetId`). */
  emergentRouteSheetId?: string;
  /** Tramos (snapshot) para mapa en feed sin `routeOfferPublic` local. Misma estructura que en la API. */
  emergentRouteParadas?: EmergentRouteParadaSnapshot[];
  /** Moneda de pago (snapshot) si la hoja de ruta la definió. */
  emergentMonedaPago?: string;
};

/** Transportista asignado o pendiente de validación en un tramo de una oferta de ruta publicada. */
export type RouteOfferTramoAssignment = {
  status: "pending" | "confirmed";
  userId: string;
  displayName: string;
  phone: string;
  trustScore: number;
  vehicleLabel?: string;
  /** Servicio de catálogo con el que se suscribió (validado en servidor si aplica). */
  storeServiceId?: string;
};

export type RouteOfferTramoPublic = {
  stopId: string;
  orden: number;
  origenLine: string;
  destinoLine: string;
  origenLat?: string;
  origenLng?: string;
  destinoLat?: string;
  destinoLng?: string;
  /** Campos de la hoja publicada visibles al transportista antes de suscribirse. */
  cargaEnTramo?: string;
  tipoMercanciaCarga?: string;
  tipoMercanciaDescarga?: string;
  tipoVehiculoRequerido?: string;
  tiempoRecogidaEstimado?: string;
  tiempoEntregaEstimado?: string;
  precioTransportista?: string;
  notas?: string;
  requisitosEspeciales?: string;
  /** Teléfono por tramo en la hoja (vendedor o post-validación de suscripción). */
  telefonoTransportista?: string;
  /** Invitación por ficha de servicio indicada en la hoja (vendedor). */
  transportInvitedStoreServiceId?: string;
  transportInvitedServiceSummary?: string;
  /** Moneda del precio de este tramo en la hoja. */
  monedaPago?: string;
  /** Km por red (OSRM) persistidos en la hoja al guardar. */
  osrmRoadKm?: number;
  /** Polilínea [lat,lng] por carretera persistida al guardar la hoja. */
  osrmRouteLatLngs?: [number, number][];
  assignment?: RouteOfferTramoAssignment;
};

/** Vista pública de una hoja de ruta ofrecida a transportistas (feed + ficha de oferta). */
export type RouteOfferPublicState = {
  threadId: string;
  routeSheetId: string;
  routeTitle: string;
  mercanciasResumen?: string;
  /** Notas generales de la hoja (mismo texto que en el acuerdo / rail). */
  notasGenerales?: string;
  /** Estado de la hoja (`programada`, etc.). */
  hojaEstado?: string;
  tramos: RouteOfferTramoPublic[];
};
