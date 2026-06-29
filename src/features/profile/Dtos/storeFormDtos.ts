import type {
  StoreProduct,
  StoreService,
} from '@features/market/model/storeCatalogTypes'

export type ProductFormSnapshot = Omit<StoreProduct, 'id' | 'storeId'>

export type ServiceFormSnapshot = Omit<StoreService, 'id' | 'storeId'>
