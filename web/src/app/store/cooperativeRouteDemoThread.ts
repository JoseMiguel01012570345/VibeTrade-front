import type { RouteSheet } from '../../pages/chat/domain/routeSheetTypes'
import { normalizeMerchandiseLine, type TradeAgreement } from '../../pages/chat/domain/tradeAgreementTypes'
import type { Message, RouteOfferPublicState, Thread } from './marketStoreTypes'
import { demoStores } from './marketStoreSeed'

export const COOPERATIVE_DEMO_THREAD_ID = 'th_demo_coop_ruta'
export const COOPERATIVE_DEMO_OFFER_ID = 'o_demo_malanga_ruta'

const T0 = Date.UTC(2024, 5, 12, 14, 30, 0)

const agreement: TradeAgreement = {
  id: 'agr_demo_malanga_001',
  threadId: COOPERATIVE_DEMO_THREAD_ID,
  title: 'Compra malanga 1T + ruta cooperativa A→B→C',
  issuedAt: T0 + 60_000,
  issuedByStoreId: 's1',
  issuerLabel: 'AgroNorte SRL',
  status: 'accepted',
  respondedAt: T0 + 120_000,
  includeMerchandise: true,
  includeService: false,
  merchandise: [
    normalizeMerchandiseLine({
      linkedStoreProductId: 's1-prod-malanga',
      tipo: 'Malanga grado industria',
      cantidad: '1 tonelada',
      valorUnitario: 'USD 980',
      estado: 'nuevo',
      descuento: 'Ninguno',
      impuestos: 'IVA según factura',
      moneda: 'USD',
      tipoEmbalaje: 'A granel embalaje estándar',
      devolucionesDesc: 'Reclamos por calidad 48 h con acta',
      devolucionQuienPaga: 'Según acuerdo en recepción',
      devolucionPlazos: '48 h hábiles',
      regulaciones: 'Certificado sanitario según normativa vigente',
    }),
  ],
  services: [],
  routeSheetId: 'ruta_demo_coop_001',
}

const routeSheet: RouteSheet = {
  id: 'ruta_demo_coop_001',
  threadId: COOPERATIVE_DEMO_THREAD_ID,
  titulo: 'Ruta demo: Posadas → Corrientes → Rosario',
  creadoEn: T0 + 180_000,
  actualizadoEn: T0 + 600_000,
  estado: 'programada',
  mercanciasResumen:
    'Malanga a granel 1 t. Cadena seca. Coordinación entre dos transportistas en relevo en Corrientes.',
  paradas: [
    {
      id: 'stop_demo_ab',
      orden: 1,
      origen: 'Planta Posadas (Misiones)',
      destino: 'HUB Corrientes',
      origenLat: '-27.3671',
      origenLng: '-55.8961',
      destinoLat: '-27.4692',
      destinoLng: '-58.8306',
      tiempoRecogidaEstimado: '3',
      tiempoEntregaEstimado: '8',
      precioTransportista: '185000',
      cargaEnTramo: '1 tonelada malanga paletizada / big-bags según disponibilidad en origen.',
      tipoMercanciaCarga: 'Raíz alimentaria a granel embalada',
      tipoMercanciaDescarga: 'Misma · transbordo controlado a unidad B→C',
      notas: 'Checklist de lote y fotos al cargar. Punto de encuentro en playa de Corrientes acordado.',
      responsabilidadEmbalaje: 'Responsabilidad del shipper en origen hasta carga en vehículo.',
      requisitosEspeciales: 'Mantener lona; sin cadena de frío obligatoria.',
      tipoVehiculoRequerido: 'Semirremolque baranda o carga general apta 12 t',
      telefonoTransportista: '+54 9 343 500-8899',
      completada: false,
    },
    {
      id: 'stop_demo_bc',
      orden: 2,
      origen: 'HUB Corrientes',
      destino: 'Depósito Rosario',
      origenLat: '-27.4692',
      origenLng: '-58.8306',
      destinoLat: '-32.9442',
      destinoLng: '-60.6505',
      tiempoRecogidaEstimado: '2',
      tiempoEntregaEstimado: '10',
      precioTransportista: '220000',
      cargaEnTramo: 'Misma tonelada — continuidad tras relevo en Corrientes.',
      tipoMercanciaCarga: 'Raíz alimentaria',
      tipoMercanciaDescarga: 'Raíz alimentaria',
      notas: 'Coordinación telefónica entre conductores en Corrientes para enganche y documentación.',
      responsabilidadEmbalaje: 'Transportista B revisa integridad del embalaje al recibir en HUB.',
      requisitosEspeciales: 'Documentación de trazabilidad del lote en mano.',
      tipoVehiculoRequerido: 'Tractor + semi corta o configurable hasta 16 t',
      telefonoTransportista: undefined,
      completada: false,
    },
  ],
  notasGenerales:
    'Hoja publicada a transportistas; suscripciones simuladas en demo. Teléfonos por tramo completados por el vendedor.',
  publicadaPlataforma: true,
  editadaEnFormulario: true,
}

const messages: Message[] = [
  {
    id: 'demo_coop_msg_0',
    from: 'system',
    type: 'text',
    text: 'Inicio de chat de compra · Malanga 1T — demo ruta cooperativa (Posadas–Rosario). Credenciales del negocio y disponibilidad de transporte se destacan arriba.',
    at: T0,
  },
  {
    id: 'demo_coop_msg_1',
    from: 'other',
    type: 'text',
    text: 'Hola Laura, coordinamos la operación con ruta en dos tramos. Emitimos el acuerdo con mercancía y la hoja quedará publica para que los transportistas se sumen.',
    at: T0 + 45_000,
    read: true,
  },
  {
    id: 'demo_coop_msg_agr',
    from: 'other',
    type: 'agreement',
    agreementId: agreement.id,
    title: agreement.title,
    at: T0 + 60_000,
    read: true,
  },
  {
    id: 'demo_coop_msg_acc',
    from: 'system',
    type: 'text',
    text: `Acuerdo «${agreement.title}» aceptado por ambas partes. No puede derogarse; pueden emitirse nuevos contratos adicionales.`,
    at: T0 + 120_000,
  },
  {
    id: 'demo_coop_msg_pub',
    from: 'system',
    type: 'text',
    text: `Hoja de ruta «${routeSheet.titulo}» publicada en la plataforma. Los transportistas pueden suscribirse tramo a tramo; el ingreso al chat operativo queda habilitado una vez validada la suscripción (demo).`,
    at: T0 + 240_000,
  },
  {
    id: 'demo_coop_msg_sub1',
    from: 'system',
    type: 'text',
    text: 'María Benedetti quedó asignada y validada en el tramo Posadas–Corrientes (A→B) con su unidad Mercedes Actros. El tramo Corrientes–Rosario sigue abierto a suscripción de transportistas.',
    at: T0 + 300_000,
  },
]

export const cooperativeRouteDemoThread: Thread = {
  id: COOPERATIVE_DEMO_THREAD_ID,
  offerId: COOPERATIVE_DEMO_OFFER_ID,
  storeId: 's1',
  store: demoStores.s1,
  purchaseMode: true,
  messages,
  contracts: [agreement],
  routeSheets: [routeSheet],
  paymentCompleted: true,
  demoBuyer: {
    id: 'u_demo_buyer_laura',
    name: 'Laura Méndez',
    trustScore: 79,
  },
  chatCarriers: [
    {
      id: 'u_demo_carrier_maria',
      name: 'María Benedetti',
      phone: '+54 9 343 500-8899',
      trustScore: 74,
      vehicleLabel: 'Mercedes Actros + semi',
      tramoLabel: 'Tramo A→B (Posadas–Corrientes)',
    },
  ],
}

/** Estado inicial de la oferta de ruta: un tramo cubierto y validado; el otro libre para suscripción. */
export function getInitialRouteOfferPublic(): Record<string, RouteOfferPublicState> {
  return {
    [COOPERATIVE_DEMO_OFFER_ID]: {
      threadId: COOPERATIVE_DEMO_THREAD_ID,
      routeSheetId: routeSheet.id,
      routeTitle: routeSheet.titulo,
      mercanciasResumen: routeSheet.mercanciasResumen,
      notasGenerales: routeSheet.notasGenerales,
      hojaEstado: routeSheet.estado,
      tramos: routeSheet.paradas.map((p, i) => ({
        stopId: p.id,
        orden: p.orden,
        origenLine: p.origen,
        destinoLine: p.destino,
        cargaEnTramo: p.cargaEnTramo,
        tipoMercanciaCarga: p.tipoMercanciaCarga,
        tipoMercanciaDescarga: p.tipoMercanciaDescarga,
        tipoVehiculoRequerido: p.tipoVehiculoRequerido,
        tiempoRecogidaEstimado: p.tiempoRecogidaEstimado,
        tiempoEntregaEstimado: p.tiempoEntregaEstimado,
        precioTransportista: p.precioTransportista,
        notas: p.notas,
        requisitosEspeciales: p.requisitosEspeciales,
        assignment:
          i === 0 ?
            {
              status: 'confirmed',
              userId: 'u_demo_carrier_maria',
              displayName: 'María Benedetti',
              phone: '+54 9 343 500-8899',
              trustScore: 74,
              vehicleLabel: 'Mercedes Actros + semi',
            }
          : undefined,
      })),
    },
  }
}
