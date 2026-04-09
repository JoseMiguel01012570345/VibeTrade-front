import type { StoreCatalog, StoreProduct, StoreService } from '../../pages/chat/domain/storeCatalogTypes'
import type { StoreBadge } from './marketStoreTypes'
import { uid } from './marketStoreHelpers'
import { isOwnerOfStore, normStoreName } from './marketSliceHelpers'
import type { MarketSliceGet, MarketSliceSet } from './marketSliceTypes'
import type { MarketState } from './marketStoreTypes'

export function createOwnerStoresSlice(set: MarketSliceSet, get: MarketSliceGet): Pick<MarketState,
  | 'createOwnerStore'
  | 'updateOwnerStore'
  | 'deleteOwnerStore'
  | 'addOwnerStoreProduct'
  | 'updateOwnerStoreProduct'
  | 'removeOwnerStoreProduct'
  | 'setOwnerStoreProductPublished'
  | 'setOwnerStoreServicePublished'
  | 'addOwnerStoreService'
  | 'updateOwnerStoreService'
  | 'removeOwnerStoreService'
> {
  return {
createOwnerStore: (ownerUserId, values) => {
  const name = values.name.trim()
  if (!name) return null
  const normalized = normStoreName(name)
  const existing = Object.values(get().stores).find((x) => normStoreName(x.name) === normalized)
  if (existing) return null
  const cats = values.categories.map((c) => c.trim()).filter(Boolean)
  const id = uid('ust')
  const badge: StoreBadge = {
    id,
    name,
    verified: false,
    categories: cats.length ? cats : ['Sin categoría'],
    transportIncluded: values.transportIncluded,
    trustScore: 65,
    ownerUserId,
    ...(values.location ? { location: values.location } : {}),
  }
  const catalog: StoreCatalog = {
    pitch: values.categoryPitch.trim(),
    joinedAt: Date.now(),
    products: [],
    services: [],
  }
  set((s) => ({
    ...s,
    stores: { ...s.stores, [id]: badge },
    storeCatalogs: { ...s.storeCatalogs, [id]: catalog },
  }))
  return id
},

updateOwnerStore: (storeId, ownerUserId, patch) => {
  const s = get()
  if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
  const st = s.stores[storeId]
  const cat = s.storeCatalogs[storeId]
  if (!st || !cat) return false
  if (patch.name !== undefined) {
    const candidate = patch.name.trim()
    const normalized = normStoreName(candidate)
    if (normalized) {
      const clash = Object.values(s.stores).find(
        (x) => x.id !== storeId && normStoreName(x.name) === normalized,
      )
      if (clash) return false
    }
  }
  set((prev) => {
    let nextBadge: StoreBadge = {
      ...st,
      ...(patch.name !== undefined ? { name: patch.name.trim() || st.name } : {}),
      ...(patch.categories !== undefined
        ? {
            categories: patch.categories.length ? patch.categories : st.categories,
          }
        : {}),
      ...(patch.transportIncluded !== undefined
        ? { transportIncluded: patch.transportIncluded }
        : {}),
      ...(patch.avatarUrl !== undefined
        ? {
            avatarUrl:
              patch.avatarUrl === null || patch.avatarUrl === ''
                ? undefined
                : patch.avatarUrl,
          }
        : {}),
    }
    if ('location' in patch) {
      if (patch.location === undefined) {
        const { location: _removed, ...rest } = nextBadge
        nextBadge = rest as StoreBadge
      } else {
        nextBadge = { ...nextBadge, location: patch.location }
      }
    }
    const nextCat: StoreCatalog =
      patch.categoryPitch !== undefined ? { ...cat, pitch: patch.categoryPitch } : cat
    return {
      ...prev,
      stores: { ...prev.stores, [storeId]: nextBadge },
      storeCatalogs: { ...prev.storeCatalogs, [storeId]: nextCat },
    }
  })
  return true
},

deleteOwnerStore: (storeId, ownerUserId) => {
  const s = get()
  if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
  set((prev) => {
    const { [storeId]: _removed, ...restStores } = prev.stores
    const { [storeId]: _cat, ...restCat } = prev.storeCatalogs
    return { ...prev, stores: restStores, storeCatalogs: restCat }
  })
  return true
},

addOwnerStoreProduct: (storeId, ownerUserId, input) => {
  const s = get()
  if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return null
  const cat =
    s.storeCatalogs[storeId] ??
    ({
      pitch: '',
      joinedAt: Date.now(),
      products: [],
      services: [],
    } satisfies StoreCatalog)
  const pid = uid('prd')
  const product: StoreProduct = { ...input, id: pid, storeId }
  set((prev) => ({
    ...prev,
    storeCatalogs: {
      ...prev.storeCatalogs,
      [storeId]: { ...cat, products: [...cat.products, product] },
    },
  }))
  return pid
},

updateOwnerStoreProduct: (storeId, ownerUserId, productId, input) => {
  const s = get()
  if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
  const cat = s.storeCatalogs[storeId]
  if (!cat) return false
  const idx = cat.products.findIndex((p) => p.id === productId)
  if (idx < 0) return false
  const next: StoreProduct = { ...input, id: productId, storeId }
  const products = [...cat.products]
  products[idx] = next
  set((prev) => ({
    ...prev,
    storeCatalogs: { ...prev.storeCatalogs, [storeId]: { ...cat, products } },
  }))
  return true
},

removeOwnerStoreProduct: (storeId, ownerUserId, productId) => {
  const s = get()
  if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
  const cat = s.storeCatalogs[storeId]
  if (!cat) return false
  set((prev) => ({
    ...prev,
    storeCatalogs: {
      ...prev.storeCatalogs,
      [storeId]: { ...cat, products: cat.products.filter((p) => p.id !== productId) },
    },
  }))
  return true
},

setOwnerStoreProductPublished: (storeId, ownerUserId, productId, published) => {
  const s = get()
  if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
  const cat = s.storeCatalogs[storeId]
  if (!cat) return false
  const idx = cat.products.findIndex((p) => p.id === productId)
  if (idx < 0) return false
  const products = [...cat.products]
  products[idx] = { ...products[idx], published }
  set((prev) => ({
    ...prev,
    storeCatalogs: { ...prev.storeCatalogs, [storeId]: { ...cat, products } },
  }))
  return true
},

setOwnerStoreServicePublished: (storeId, ownerUserId, serviceId, published) => {
  const s = get()
  if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
  const cat = s.storeCatalogs[storeId]
  if (!cat) return false
  const idx = cat.services.findIndex((x) => x.id === serviceId)
  if (idx < 0) return false
  const services = [...cat.services]
  services[idx] = { ...services[idx], published }
  set((prev) => ({
    ...prev,
    storeCatalogs: { ...prev.storeCatalogs, [storeId]: { ...cat, services } },
  }))
  return true
},

addOwnerStoreService: (storeId, ownerUserId, input) => {
  const s = get()
  if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return null
  const cat =
    s.storeCatalogs[storeId] ??
    ({
      pitch: '',
      joinedAt: Date.now(),
      products: [],
      services: [],
    } satisfies StoreCatalog)
  const sid = uid('svc')
  const service: StoreService = { ...input, id: sid, storeId }
  set((prev) => ({
    ...prev,
    storeCatalogs: {
      ...prev.storeCatalogs,
      [storeId]: { ...cat, services: [...cat.services, service] },
    },
  }))
  return sid
},

updateOwnerStoreService: (storeId, ownerUserId, serviceId, input) => {
  const s = get()
  if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
  const cat = s.storeCatalogs[storeId]
  if (!cat) return false
  const idx = cat.services.findIndex((x) => x.id === serviceId)
  if (idx < 0) return false
  const next: StoreService = { ...input, id: serviceId, storeId }
  const services = [...cat.services]
  services[idx] = next
  set((prev) => ({
    ...prev,
    storeCatalogs: { ...prev.storeCatalogs, [storeId]: { ...cat, services } },
  }))
  return true
},

removeOwnerStoreService: (storeId, ownerUserId, serviceId) => {
  const s = get()
  if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
  const cat = s.storeCatalogs[storeId]
  if (!cat) return false
  set((prev) => ({
    ...prev,
    storeCatalogs: {
      ...prev.storeCatalogs,
      [storeId]: { ...cat, services: cat.services.filter((x) => x.id !== serviceId) },
    },
  }))
  return true
},
  }
}
