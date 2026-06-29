import type {
  StoreProduct,
  StoreService,
} from '@features/market/logic/storeCatalogTypes'

export type ProductFormSnapshot = Omit<StoreProduct, 'id' | 'storeId'>

export type ServiceFormSnapshot = Omit<StoreService, 'id' | 'storeId'>
