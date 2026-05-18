import type { StoreBadge } from "@app/store/useMarketStore"

import type { ThreadChatCarrier } from "@app/store/marketStoreTypes"

export type ChatParticipantRole = 'buyer' | 'seller' | 'carrier'

export type ChatParticipant = {
  id: string
  name: string
  role: ChatParticipantRole
  roleLabel: string
  trustScore: number
  verified?: boolean
  avatarUrl?: string
  phone?: string
  detail?: string
  /** Destino al tocar la fila: vitrina del negocio (vendedor) o perfil (resto). */
  href: string
}

/** Integrantes del hilo: comprador, vendedor (perfil: `ownerUserId` de la tienda si existe, si no `store.id`) y transportistas. */
export function buildChatParticipants(
  buyer: { id: string; name: string; trustScore: number; avatarUrl?: string },
  seller: StoreBadge,
  carriers?: ThreadChatCarrier[],
): ChatParticipant[] {
  const buyerId = buyer.id.trim()
  const sellerId = (seller.ownerUserId ?? seller.id).trim()
  const seen = new Set<string>()
  const out: ChatParticipant[] = []

  const buyerHref =
    buyerId.startsWith('vt-thread-buyer:') ? '#' : `/profile/${buyer.id}`
  out.push({
    id: buyer.id,
    name: buyer.name,
    role: 'buyer',
    roleLabel: 'Comprador',
    trustScore: buyer.trustScore,
    avatarUrl: buyer.avatarUrl,
    href: buyerHref,
  })
  seen.add(buyerId)

  if (!seen.has(sellerId)) {
    out.push({
      id: seller.ownerUserId ?? seller.id,
      name: seller.name,
      role: 'seller',
      roleLabel: 'Vendedor',
      trustScore: seller.trustScore,
      verified: seller.verified,
      avatarUrl: seller.avatarUrl,
      href: `/store/${seller.id}/vitrina`,
    })
    seen.add(sellerId)
  }

  if (carriers?.length) {
    for (const c of carriers) {
      const cid = (c.id ?? '').trim()
      if (!cid || seen.has(cid)) continue
      if (cid === buyerId || cid === sellerId) continue
      seen.add(cid)
      out.push({
        id: c.id,
        name: c.name,
        role: 'carrier',
        roleLabel: 'Transportista',
        trustScore: c.trustScore,
        avatarUrl: c.avatarUrl,
        phone: c.phone,
        detail: [c.tramoLabel.trim(), c.vehicleLabel?.trim()]
          .filter(Boolean)
          .join(' · '),
        href: `/profile/${c.id}`,
      })
    }
  }
  return out
}
