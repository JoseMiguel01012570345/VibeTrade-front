import type { Offer, StoreBadge } from './marketStoreTypes'

export const demoStores: Record<string, StoreBadge> = {
  s1: {
    id: 's1',
    name: 'AgroNorte SRL',
    verified: true,
    categories: ['Mercancías', 'Cosechas'],
    transportIncluded: false,
    trustScore: 88,
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
