import type {
  StoreCatalog,
  StoreProduct,
  StoreService,
} from "@features/market/model/storeCatalogTypes";
import type {
  ProductFormSnapshot,
  ServiceFormSnapshot,
} from "@features/profile/profileStoreFormValidation";

export function makeStoreProduct(
  overrides: Partial<StoreProduct> = {},
): StoreProduct {
  return {
    id: "prod-1",
    storeId: "store-1",
    category: "Electrónica",
    name: "Producto Alpha",
    shortDescription: "Descripción breve del producto.",
    mainBenefit: "Beneficio principal claro.",
    technicalSpecs: "Especificaciones técnicas completas.",
    condition: "nuevo",
    price: "100 USD",
    monedaPrecio: "USD",
    monedas: ["USD"],
    transportIncluded: true,
    taxesShippingInstall: "No aplica",
    availability: "Disponible inmediato",
    warrantyReturn: "Garantía de 30 días",
    contentIncluded: "Incluye manual y accesorios",
    usageConditions: "Uso doméstico estándar",
    photoUrls: ["https://example.com/p.jpg"],
    published: true,
    publicCommentCount: 3,
    offerLikeCount: 7,
    customFields: [],
    ...overrides,
  };
}

export function makeStoreService(
  overrides: Partial<StoreService> = {},
): StoreService {
  return {
    id: "svc-1",
    storeId: "store-1",
    category: "Servicios",
    tipoServicio: "Consultoría",
    monedas: ["USD"],
    descripcion: "Servicio de consultoría profesional.",
    riesgos: { enabled: false, items: [] },
    incluye: "Incluye reunión inicial",
    noIncluye: "No incluye viajes",
    dependencias: { enabled: false, items: [] },
    entregables: "Informe final en PDF",
    garantias: { enabled: false, texto: "" },
    propIntelectual: "Propiedad del cliente tras entrega",
    photoUrls: [],
    published: true,
    publicCommentCount: 2,
    offerLikeCount: 5,
    customFields: [],
    ...overrides,
  };
}

export function makeStoreCatalog(
  overrides: Partial<StoreCatalog> = {},
): StoreCatalog {
  return {
    pitch: "Catálogo de prueba",
    joinedAt: Date.now(),
    products: [makeStoreProduct()],
    services: [makeStoreService()],
    ...overrides,
  };
}

export function makeValidProductForm(
  overrides: Partial<ProductFormSnapshot> = {},
): ProductFormSnapshot {
  const p = makeStoreProduct();
  const { id: _id, storeId: _sid, ...form } = p;
  return { ...form, ...overrides };
}

export function makeValidServiceForm(
  overrides: Partial<ServiceFormSnapshot> = {},
): ServiceFormSnapshot {
  const s = makeStoreService();
  const { id: _id, storeId: _sid, ...form } = s;
  return { ...form, ...overrides };
}
