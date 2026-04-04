import type { ReelComment } from './ReelCommentsPanel'

/** Reel de demo con tienda de origen para vitrina y filtrado en `/reels`. */
export type DemoReel = {
  id: string
  title: string
  category: string
  by: string
  cover: string
  storeId: string
}

export const DEMO_REELS: DemoReel[] = [
  {
    id: 'r1',
    title: 'Cosecha: Malanga premium',
    category: 'Mercancías',
    by: 'AgroNorte SRL',
    storeId: 's1',
    cover:
      'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'r2',
    title: 'Flete 5 Ton - disponibilidad hoy',
    category: 'Transportista',
    by: 'Flete Rápido',
    storeId: 's2',
    cover:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'r3',
    title: 'Cadena fría: exportación hortícola',
    category: 'Logística',
    by: 'Logística Sur',
    storeId: 's3',
    cover:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'r4',
    title: 'Granos a granel — origen Rosario',
    category: 'Mercancías',
    by: 'AgroNorte SRL',
    storeId: 's1',
    cover:
      'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'r5',
    title: 'Semi-remolque disponible Bs.As. → NEA',
    category: 'Transportista',
    by: 'Logística Sur',
    storeId: 's3',
    cover:
      'https://images.unsplash.com/photo-1519003722824-cd2daa86a310?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'r6',
    title: 'Flota propia · carga general y refrigerada',
    category: 'Transportista',
    by: 'Transportes Jhosef',
    storeId: 's_jhosef',
    cover:
      'https://images.unsplash.com/photo-1566576721346-d082460c8711?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'r7',
    title: 'Consolidados rutas largas · disponibilidad semanal',
    category: 'Transportista',
    by: 'Benedetti Logística',
    storeId: 's_benedetti',
    cover:
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
  },
]

export const REEL_TITLES_BY_ID: Record<string, string> = Object.fromEntries(
  DEMO_REELS.map((r) => [r.id, r.title]),
)

export function reelsForStore(storeId: string): DemoReel[] {
  return DEMO_REELS.filter((r) => r.storeId === storeId)
}

export const INITIAL_REEL_LIKE_COUNTS: Record<string, number> = {
  r1: 128,
  r2: 42,
  r3: 89,
  r4: 203,
  r5: 17,
  r6: 56,
  r7: 41,
}

export const INITIAL_COMMENTS: Record<string, ReelComment[]> = {
  r1: [
    {
      id: 'rc_demo_1',
      parentId: null,
      authorName: 'María',
      text: '¿Sigue disponible la misma cosecha?',
      at: Date.now() - 3_600_000,
      ratingsByUser: { u_maria: 0.1, u_demo_a: 0.2, u_demo_b: 0.15 },
    },
    {
      id: 'rc_demo_2',
      parentId: 'rc_demo_1',
      authorName: 'AgroNorte SRL',
      text: 'Sí, tenemos stock para esta semana.',
      at: Date.now() - 1_800_000,
      ratingsByUser: { u_store: 0.8, u_demo_a: 0.65, u_demo_c: 0.72 },
    },
  ],
  r2: [],
  r3: [
    {
      id: 'rc_demo_r3_1',
      parentId: null,
      authorName: 'Lucas',
      text: '¿Cubren documentación Aduana?',
      at: Date.now() - 7200_000,
      ratingsByUser: { u_lucas: 0.1, u_demo_d: 0.2 },
    },
  ],
  r4: [],
  r5: [
    {
      id: 'rc_demo_r5_1',
      parentId: null,
      authorName: 'Ana',
      text: 'Precio por km aproximado?',
      at: Date.now() - 5400_000,
      ratingsByUser: { u_ana: 0.15 },
    },
    {
      id: 'rc_demo_r5_2',
      parentId: 'rc_demo_r5_1',
      authorName: 'Logística Sur',
      text: 'Te escribimos al DM con tarifario.',
      at: Date.now() - 3600_000,
      ratingsByUser: { u_store: 0.75 },
    },
  ],
  r6: [],
  r7: [],
}
