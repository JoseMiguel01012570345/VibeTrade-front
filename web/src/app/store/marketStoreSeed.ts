import type { StoreCatalog, StoreProduct, StoreService } from '../../pages/chat/domain/storeCatalogTypes'
import type { Offer, StoreBadge } from './marketStoreTypes'

/** Usuario demo dueño de la tienda AgroNorte (vendedor en hilos de compra). */
export const DEMO_SELLER_AGRONORTE_USER_ID = 'u_demo_seller_agronorte'

export const demoStores: Record<string, StoreBadge> = {
  /** Tienda de Jhosef: oferta servicios de transporte en catálogo (demo). */
  s_jhosef: {
    id: 's_jhosef',
    name: 'Transportes Jhosef',
    verified: false,
    categories: ['Transportista', 'Carga general'],
    transportIncluded: true,
    trustScore: 72,
    ownerUserId: 'me',
  },
  /** Otro transportista: tienda mock para el segundo conductor en la ruta demo. */
  s_benedetti: {
    id: 's_benedetti',
    name: 'Benedetti Logística',
    verified: false,
    categories: ['Transportista', 'Larga distancia'],
    transportIncluded: true,
    trustScore: 74,
    ownerUserId: 'u_demo_carrier_maria',
  },
  s1: {
    id: 's1',
    name: 'AgroNorte SRL',
    verified: true,
    categories: ['Mercancías', 'Cosechas'],
    transportIncluded: false,
    trustScore: 88,
    ownerUserId: DEMO_SELLER_AGRONORTE_USER_ID,
  },
  s2: {
    id: 's2',
    name: 'Flete Rápido',
    verified: false,
    categories: ['Transportista', 'Logística'],
    transportIncluded: true,
    trustScore: 63,
  },
  s3: {
    id: 's3',
    name: 'Logística Sur',
    verified: true,
    categories: ['Transportista', 'Carga general'],
    transportIncluded: true,
    trustScore: 71,
  },
}

export const demoOffers: Offer[] = [
  {
    id: 'o_demo_malanga_ruta',
    storeId: 's1',
    title: 'Hoja de ruta publicada: malanga 1T · Posadas → Rosario (2 tramos)',
    price: 'Suscripción transportista',
    location: 'NEA → Litoral (demo)',
    tags: ['Hoja de ruta', 'Para transportistas', 'demo-ruta-publica', 'A→B→C'],
    imageUrl:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    qa: [],
  },
  {
    id: 'o1',
    storeId: 's1',
    title: 'Cosecha de Malanga (1 Ton)',
    price: 'USD 980',
    location: 'Misiones, AR',
    tags: ['Cosecha', 'Alimentos', 'B2B'],
    imageUrl:
      'https://images.unsplash.com/photo-1604908177522-4028c7a2e08d?auto=format&fit=crop&w=1200&q=80',
    qa: [
      {
        id: 'qa1',
        question: '¿Incluye embalaje?',
        askedBy: { id: 'me', name: 'Jhosef', trustScore: 72 },
        answeredBy: { id: 's1', name: 'AgroNorte SRL', trustScore: 88 },
        answer: 'Sí, incluye embalaje estándar. Podemos cotizar reforzado.',
        createdAt: Date.now() - 1000 * 60 * 60 * 2,
      },
      {
        id: 'qa2',
        question: '¿Entregan en zona norte?',
        askedBy: { id: 'u2', name: 'María', trustScore: 74 },
        answeredBy: { id: 's1', name: 'AgroNorte SRL', trustScore: 88 },
        answer: 'Sí, coordinamos logística.',
        createdAt: Date.now() - 1000 * 60 * 60 * 3,
      },
    ],
  },
  {
    id: 'o2',
    storeId: 's1',
    title: 'Semillas certificadas (Pack 100)',
    price: 'USD 120',
    location: 'Corrientes, AR',
    tags: ['Insumos', 'Certificado'],
    imageUrl:
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80',
    qa: [],
  },
  {
    id: 'o3',
    storeId: 's1',
    title: 'Aceite de oliva extra virgen — bidón 20 L',
    price: 'USD 185 / unidad',
    location: 'Mendoza, AR',
    tags: ['Mercancías', 'Alimentos', 'Mayorista'],
    imageUrl:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=1200&q=80',
    qa: [],
  },
  {
    id: 'o4',
    storeId: 's2',
    title: 'Flete refrigerado CABA ↔ Litoral (pallets)',
    price: 'Cotizar',
    location: 'Buenos Aires, AR',
    tags: ['Servicio', 'Cadena fría', 'Transporte'],
    imageUrl:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    qa: [
      {
        id: 'qa_o4_1',
        question: '¿Temperatura controlada en todo el trayecto?',
        askedBy: { id: 'me', name: 'Jhosef', trustScore: 72 },
        answeredBy: { id: 's2', name: 'Flete Rápido', trustScore: 63 },
        answer: 'Sí, monitoreo GPS + registro de temperatura.',
        createdAt: Date.now() - 1000 * 60 * 60 * 5,
      },
    ],
  },
  {
    id: 'o5',
    storeId: 's3',
    title: 'Almacenaje + picking para e-commerce (zona sur)',
    price: 'USD 0,45 / unidad / mes',
    location: 'La Plata, AR',
    tags: ['Servicio', 'Logística', 'Fulfillment'],
    imageUrl:
      'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80',
    qa: [],
  },
  {
    id: 'o6',
    storeId: 's1',
    title: 'Miel orgánica multifloral — tambor 300 kg',
    price: 'USD 2.650',
    location: 'Entre Ríos, AR',
    tags: ['Mercancías', 'Orgánico', 'B2B'],
    imageUrl:
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1200&q=80',
    qa: [],
  },
]

const fleteTransportService: StoreService = {
  id: 's_jhosef-svc-flete',
  storeId: 's_jhosef',
  category: 'Transporte',
  tipoServicio: 'Flete mercancía general y raíces (NEA, Litoral, Rosario)',
  descripcion:
    'Unidades con baranda y semirremolque para pallets y granel apilado. Coordinación de dos tramos con relevo.',
  riesgos: {
    enabled: true,
    items: ['Demoras por climas extremos en ruta.', 'Espera en frontera de depósito mayor a 4 h sin aviso.'],
  },
  incluye: 'Conductor habilitado, comunicación durante el viaje, remito en demo.',
  noIncluye: 'Custodia nocturna en destino sin contrato aparte.',
  dependencias: { enabled: false, items: [] },
  entregables: 'Acuse y fotos de descarga (demo).',
  garantias: { enabled: false, texto: '' },
  propIntelectual: 'Sin transferencia de know-how; servicio puntual de transporte.',
  customFields: [
    {
      title: 'Dotación',
      body: 'Flota propia: Scania R450 u homologado 12–16 t según disponibilidad.',
    },
  ],
}

const benedettiFleteService: StoreService = {
  id: 's_benedetti-svc-flete',
  storeId: 's_benedetti',
  category: 'Transporte',
  tipoServicio: 'Flete semirremolque Cuyo / Litoral / Rosario',
  descripcion:
    'Unidades Mercedes Actros y similares. Enfoque en segundo tramo y relevos en hub intermedio.',
  riesgos: {
    enabled: true,
    items: ['Restricciones viales por lluvia.', 'Demoras en fiscalización en ruta.'],
  },
  incluye: 'Conductor, peajes básicos cotizados, contacto con despachante en demo.',
  noIncluye: 'Almacenaje nocturno en destino.',
  dependencias: { enabled: false, items: [] },
  entregables: 'Remito digital.',
  garantias: { enabled: false, texto: '' },
  propIntelectual: 'N/A',
  customFields: [
    {
      title: 'Flota',
      body: 'Semis 14–16 t, furgones y baranda.',
    },
  ],
}

const agroProducts: StoreProduct[] = [
  {
    id: 's1-prod-malanga',
    storeId: 's1',
    category: 'Cosechas',
    name: 'Cosecha de Malanga',
    model: 'Grado exportación',
    shortDescription: 'Raíz seleccionada para industria alimentaria y mayoristas.',
    mainBenefit: 'Lotes homogéneos con trazabilidad hasta el origen.',
    technicalSpecs: 'Humedad controlada; calibre medio; sin brotes visibles.',
    condition: 'nuevo',
    price: 'USD 980 / tonelada',
    taxesShippingInstall: 'IVA según factura. Instalación no aplica.',
    availability: 'Lotes desde 1 ton; coordinación 5–7 días hábiles.',
    warrantyReturn: 'Reclamos por calidad dentro de 48 h de recepción con acta y fotos.',
    contentIncluded: 'Embalaje estándar a granel; certificado sanitario según normativa vigente.',
    usageConditions: 'Mantener en cadena de frío recomendada por el comprador. No apto consumo sin procesamiento.',
    photoUrls: [
      'https://images.unsplash.com/photo-1604908177522-4028c7a2e08d?auto=format&fit=crop&w=800&q=80',
    ],
    published: true,
    customFields: [
      {
        title: 'Certificación orgánica',
        body: 'Disponible bajo pedido para campañas específicas.',
        attachmentNote: 'PDF de muestra en tienda',
      },
    ],
  },
  {
    id: 's1-prod-semillas',
    storeId: 's1',
    category: 'Insumos',
    name: 'Semillas certificadas',
    model: 'Pack 100 unidades',
    shortDescription: 'Alta germinación; trazabilidad de lote.',
    mainBenefit: 'Menos retrabajo en siembra y mejor uniformidad del cultivo.',
    technicalSpecs: 'Pureza declarada por proveedor; almacenaje en ambiente seco.',
    condition: 'nuevo',
    price: 'USD 120',
    taxesShippingInstall: 'Envío cotizado aparte según destino.',
    availability: 'Stock permanente en depósito NEA.',
    warrantyReturn: 'Cambio por lote defectuoso con informe de laboratorio.',
    contentIncluded: 'Bolsa sellada + etiqueta de lote.',
    usageConditions: 'Respetar fecha de siembra sugerida en envase.',
    photoUrls: [
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
    ],
    published: true,
    customFields: [],
  },
]

const agroServices: StoreService[] = [
  {
    id: 's1-svc-origen',
    storeId: 's1',
    category: 'Asesoría',
    tipoServicio: 'Auditoría de origen y trazabilidad de lote',
    descripcion:
      'Revisión documental y visita remota/presencial para asegurar cadena de custodia hasta despacho.',
    riesgos: {
      enabled: true,
      items: [
        'Demoras por acceso a campo por clima.',
        'Información incompleta del comprador puede alargar el informe.',
      ],
    },
    incluye: 'Informe resumen, checklist y recomendaciones de mejora.',
    noIncluye: 'Gestión aduanera ni certificaciones de terceros.',
    dependencias: {
      enabled: true,
      items: ['Disponibilidad del contacto en campo o en planta.', 'Documentación de compras del último ciclo.'],
    },
    entregables: 'Informe en PDF dentro de 10 días hábiles tras kick-off.',
    garantias: { enabled: true, texto: 'Corrección de errores materiales en el informe dentro de 15 días.' },
    propIntelectual:
      'El informe es propiedad del cliente para uso interno; no se redistribuye sin autorización escrita.',
    customFields: [
      {
        title: 'Nivel de profundidad',
        body: 'Estándar vs. profundo (incluye entrevistas adicionales).',
      },
    ],
  },
]

export const demoStoreCatalogs: Record<string, StoreCatalog> = {
  s_jhosef: {
    pitch:
      'Servicios de flete de Jhosef: cargas generales, malanga y pallets en NEA–Litoral hasta Rosario. Una tienda, catálogo de transporte.',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 200,
    products: [],
    services: [fleteTransportService],
  },
  s_benedetti: {
    pitch: 'Benedetti Logística: larga distancia y segunda patas en corredores húmedos.',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 310,
    products: [],
    services: [benedettiFleteService],
  },
  s1: {
    pitch:
      'Insumos y cosechas con foco B2B: granos, hortalizas de raíz y acompañamiento en trazabilidad de lote.',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 380,
    products: agroProducts,
    services: agroServices,
  },
  s2: {
    pitch: 'Transporte y cadena de frío para cargas paletizadas y sueltas.',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 120,
    products: [],
    services: [],
  },
  s3: {
    pitch: 'Fulfillment, almacenaje y última milla en zona sur.',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 220,
    products: [],
    services: [],
  },
}
