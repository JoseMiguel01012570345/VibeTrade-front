import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  LayoutGrid,
  Package,
  Truck,
  Wrench,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useMarketStore } from "../../app/store/useMarketStore";
import type { StoreBadge } from "../../app/store/marketStoreTypes";
import { VtSelect } from "../../components/VtSelect";
import {
  emptyStoreProductInput,
  emptyStoreServiceInput,
  type StoreCatalog,
  type StoreProduct,
  type StoreService,
} from "../chat/domain/storeCatalogTypes";
import { fetchStoreDetail } from "../../utils/market/fetchStoreDetail";
import {
  DEFAULT_CATALOG_CATEGORIES,
  fetchCatalogCategories,
} from "../../utils/market/fetchCatalogCategories";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import { ProductEditorModal } from "../profile/stores/ProductEditorModal";
import { ServiceEditorModal } from "../profile/stores/ServiceEditorModal";
import {
  OwnerCatalogProductList,
  OwnerCatalogServiceList,
} from "./StoreOwnerCatalogLists";
import {
  matchesCategoryFilter,
  matchesNameQuery,
} from "../../utils/market/nameCategoryFilter";
import {
  ProtectedMediaAnchor,
  ProtectedMediaImg,
} from "../../components/media/ProtectedMediaImg";

type StoreScreen = "catalog" | "vitrina" | "products" | "services";

function uniqueSorted(cats: string[]): string[] {
  return [...new Set(cats.map((c) => c.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

function screenFromPathname(pathname: string, storeId: string): StoreScreen {
  const base = `/store/${storeId}`;
  if (!pathname.startsWith(base)) return "catalog";
  const tail = pathname.slice(base.length);
  if (tail === "" || tail === "/") return "catalog";
  if (tail === "/vitrina") return "vitrina";
  if (tail === "/products") return "products";
  if (tail === "/services") return "services";
  return "catalog";
}

function ProductFiltersCard({
  productNameQ,
  onProductNameQ,
  productCategory,
  onProductCategory,
  productCategories,
}: Readonly<{
  productNameQ: string;
  onProductNameQ: (v: string) => void;
  productCategory: string;
  onProductCategory: (v: string) => void;
  productCategories: string[];
}>) {
  return (
    <div className="vt-card vt-card-pad">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        Filtrar productos
      </div>
      <p className="vt-muted mt-1 text-[12px] leading-snug">
        Por nombre, modelo o categoría.
      </p>
      <div className="vt-divider my-3" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          className="vt-input min-w-0 flex-1"
          placeholder="Nombre o modelo…"
          value={productNameQ}
          onChange={(e) => onProductNameQ(e.target.value)}
          aria-label="Filtrar productos por nombre o modelo"
        />
        <div className="sm:w-48">
          <VtSelect
            value={productCategory}
            onChange={onProductCategory}
            ariaLabel="Filtrar productos por categoría"
            placeholder="Todas las categorías"
            options={[
              { value: "", label: "Todas las categorías" },
              ...productCategories.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function ServiceFiltersCard({
  serviceNameQ,
  onServiceNameQ,
  serviceCategory,
  onServiceCategory,
  serviceCategories,
}: Readonly<{
  serviceNameQ: string;
  onServiceNameQ: (v: string) => void;
  serviceCategory: string;
  onServiceCategory: (v: string) => void;
  serviceCategories: string[];
}>) {
  return (
    <div className="vt-card vt-card-pad">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        Filtrar servicios
      </div>
      <p className="vt-muted mt-1 text-[12px] leading-snug">
        Por nombre, tipo o categoría.
      </p>
      <div className="vt-divider my-3" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          className="vt-input min-w-0 flex-1"
          placeholder="Nombre o tipo…"
          value={serviceNameQ}
          onChange={(e) => onServiceNameQ(e.target.value)}
          aria-label="Filtrar servicios por nombre o tipo"
        />
        <div className="sm:w-48">
          <VtSelect
            value={serviceCategory}
            onChange={onServiceCategory}
            ariaLabel="Filtrar servicios por categoría"
            placeholder="Todas las categorías"
            options={[
              { value: "", label: "Todas las categorías" },
              ...serviceCategories.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function VitrinaFiltersCard({
  productNameQ,
  onProductNameQ,
  productCategory,
  onProductCategory,
  productCategories,
  serviceNameQ,
  onServiceNameQ,
  serviceCategory,
  onServiceCategory,
  serviceCategories,
}: Readonly<{
  productNameQ: string;
  onProductNameQ: (v: string) => void;
  productCategory: string;
  onProductCategory: (v: string) => void;
  productCategories: string[];
  serviceNameQ: string;
  onServiceNameQ: (v: string) => void;
  serviceCategory: string;
  onServiceCategory: (v: string) => void;
  serviceCategories: string[];
}>) {
  return (
    <div className="vt-card vt-card-pad">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        Filtrar vitrina
      </div>
      <p className="vt-muted mt-1 text-[12px] leading-snug">
        Por nombre y categoría. Aplica a productos y servicios mostrados abajo.
      </p>
      <div className="vt-divider my-3" />
      <div className="grid gap-4 min-[640px]:grid-cols-2">
        <div>
          <div className="text-xs font-bold text-[var(--muted)]">Productos</div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              className="vt-input min-w-0 flex-1"
              placeholder="Nombre o modelo…"
              value={productNameQ}
              onChange={(e) => onProductNameQ(e.target.value)}
              aria-label="Filtrar productos por nombre o modelo"
            />
            <div className="sm:w-48">
              <VtSelect
                value={productCategory}
                onChange={onProductCategory}
                ariaLabel="Filtrar productos por categoría"
                placeholder="Todas las categorías"
                options={[
                  { value: "", label: "Todas las categorías" },
                  ...productCategories.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs font-bold text-[var(--muted)]">Servicios</div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              className="vt-input min-w-0 flex-1"
              placeholder="Nombre o tipo…"
              value={serviceNameQ}
              onChange={(e) => onServiceNameQ(e.target.value)}
              aria-label="Filtrar servicios por nombre"
            />
            <div className="sm:w-48">
              <VtSelect
                value={serviceCategory}
                onChange={onServiceCategory}
                ariaLabel="Filtrar servicios por categoría"
                placeholder="Todas las categorías"
                options={[
                  { value: "", label: "Todas las categorías" },
                  ...serviceCategories.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const backRowBtnClass =
  "vt-btn z-[2] shrink-0 border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.72)] shadow-[0_10px_25px_rgba(2,6,23,0.18)] backdrop-blur-[10px] hover:bg-[rgba(255,255,255,0.86)]";

function ProductDetailCard({ p }: { p: StoreProduct }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="grid min-[640px]:grid-cols-[160px_1fr]">
        <div className="relative min-h-[120px] bg-[color-mix(in_oklab,var(--bg)_75%,var(--surface))]">
          {p.photoUrls[0] ? (
            <ProtectedMediaImg
              src={p.photoUrls[0]}
              alt={p.name}
              wrapperClassName="absolute inset-0 h-full w-full"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full min-h-[120px] place-items-center text-[var(--muted)]">
              <Package size={28} aria-hidden />
            </div>
          )}
        </div>
        <div className="p-3.5">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            {p.category}
          </div>
          <div className="mt-1 text-base font-black tracking-[-0.02em]">
            {p.name}
            {p.model ? (
              <span className="font-bold text-[var(--muted)]">
                {" "}
                · {p.model}
              </span>
            ) : null}
          </div>
          <div className="mt-2 text-sm font-bold text-[color-mix(in_oklab,var(--primary)_90%,var(--text))]">
            {p.price}
          </div>
          {p.photoUrls.length > 1 ? (
            <div className="mt-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Más fotos
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {p.photoUrls.slice(1).map((url, i) => (
                  <ProtectedMediaAnchor
                    key={i}
                    href={url}
                    className="block overflow-hidden rounded-lg border border-[var(--border)]"
                  >
                    <ProtectedMediaImg
                      src={url}
                      alt=""
                      wrapperClassName="block h-16 w-16 sm:h-20 sm:w-20"
                      className="h-16 w-16 object-cover sm:h-20 sm:w-20"
                    />
                  </ProtectedMediaAnchor>
                ))}
              </div>
            </div>
          ) : null}
          <dl className="mt-3 space-y-2 text-[13px] leading-snug">
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Descripción breve
              </dt>
              <dd>{p.shortDescription}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Beneficio principal
              </dt>
              <dd>{p.mainBenefit}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Características técnicas
              </dt>
              <dd className="whitespace-pre-wrap">{p.technicalSpecs}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Estado
              </dt>
              <dd className="capitalize">{p.condition}</dd>
            </div>
            {p.taxesShippingInstall ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Impuestos / envío / instalación
                </dt>
                <dd>{p.taxesShippingInstall}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Disponibilidad
              </dt>
              <dd>{p.availability}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Garantía y devolución
              </dt>
              <dd className="whitespace-pre-wrap">{p.warrantyReturn}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Contenido incluido
              </dt>
              <dd className="whitespace-pre-wrap">{p.contentIncluded}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Condiciones de uso
              </dt>
              <dd className="whitespace-pre-wrap">{p.usageConditions}</dd>
            </div>
            {p.customFields.length > 0 ? (
              <div className="border-t border-[var(--border)] pt-2">
                <dt className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Otros campos
                </dt>
                {p.customFields.map((f, i) => (
                  <dd key={i} className="mb-3 last:mb-0">
                    <span className="font-bold">{f.title}</span>
                    {f.body ? (
                      <p className="mt-0.5 whitespace-pre-wrap leading-snug">
                        {f.body}
                      </p>
                    ) : null}
                    {f.attachmentNote ? (
                      <p className="vt-muted mt-0.5 text-[12px]">
                        {f.attachmentNote}
                      </p>
                    ) : null}
                    {f.attachments && f.attachments.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {f.attachments.map((att) =>
                          att.kind === "image" ? (
                            <ProtectedMediaAnchor
                              key={att.id}
                              href={att.url}
                              className="block"
                            >
                              <ProtectedMediaImg
                                src={att.url}
                                alt={att.fileName}
                                wrapperClassName="block max-w-[160px]"
                                className="max-h-32 max-w-[160px] rounded border border-[var(--border)] object-contain"
                              />
                            </ProtectedMediaAnchor>
                          ) : (
                            <ProtectedMediaAnchor
                              key={att.id}
                              href={att.url}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[12px] font-semibold text-[var(--primary)]"
                            >
                              {att.fileName}
                            </ProtectedMediaAnchor>
                          ),
                        )}
                      </div>
                    ) : null}
                  </dd>
                ))}
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  );
}

function ServiceDetailCard({ s }: { s: StoreService }) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div className="flex items-start gap-2">
        <Wrench
          size={20}
          className="mt-0.5 shrink-0 text-[var(--muted)]"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            {s.category}
          </div>
          <div className="mt-1 font-black tracking-[-0.02em]">
            {s.tipoServicio}
          </div>
          <p className="vt-muted mt-2 text-[13px] leading-snug">
            {s.descripcion}
          </p>
          <dl className="mt-3 space-y-2 text-[13px] leading-snug">
            {s.riesgos.enabled && s.riesgos.items.length > 0 ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Riesgos
                </dt>
                <dd>
                  <ul className="m-0 list-disc pl-4">
                    {s.riesgos.items.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Qué incluye
              </dt>
              <dd className="whitespace-pre-wrap">{s.incluye}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Qué no incluye
              </dt>
              <dd className="whitespace-pre-wrap">{s.noIncluye}</dd>
            </div>
            {s.dependencias.enabled && s.dependencias.items.length > 0 ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Dependencias
                </dt>
                <dd>
                  <ul className="m-0 list-disc pl-4">
                    {s.dependencias.items.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Qué se entrega
              </dt>
              <dd className="whitespace-pre-wrap">{s.entregables}</dd>
            </div>
            {s.garantias.enabled ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Garantías
                </dt>
                <dd className="whitespace-pre-wrap">{s.garantias.texto}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Propiedad intelectual
              </dt>
              <dd className="whitespace-pre-wrap">{s.propIntelectual}</dd>
            </div>
            {s.customFields.length > 0 ? (
              <div className="border-t border-[var(--border)] pt-2">
                <dt className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Otros campos
                </dt>
                {s.customFields.map((f, i) => (
                  <dd key={i} className="mb-3 last:mb-0">
                    <span className="font-bold">{f.title}</span>
                    {f.body ? (
                      <p className="mt-0.5 whitespace-pre-wrap leading-snug">
                        {f.body}
                      </p>
                    ) : null}
                    {f.attachmentNote ? (
                      <p className="vt-muted mt-0.5 text-[12px]">
                        {f.attachmentNote}
                      </p>
                    ) : null}
                    {f.attachments && f.attachments.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {f.attachments.map((att) =>
                          att.kind === "image" ? (
                            <ProtectedMediaAnchor
                              key={att.id}
                              href={att.url}
                              className="block"
                            >
                              <ProtectedMediaImg
                                src={att.url}
                                alt={att.fileName}
                                wrapperClassName="block max-w-[160px]"
                                className="max-h-32 max-w-[160px] rounded border border-[var(--border)] object-contain"
                              />
                            </ProtectedMediaAnchor>
                          ) : (
                            <ProtectedMediaAnchor
                              key={att.id}
                              href={att.url}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,var(--surface))] px-2 py-1 text-[12px] font-semibold text-[var(--primary)]"
                            >
                              {att.fileName}
                            </ProtectedMediaAnchor>
                          ),
                        )}
                      </div>
                    ) : null}
                  </dd>
                ))}
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  );
}

function StoreIdentityBlock({
  store,
  catalog,
  joinedLabel,
}: {
  store: StoreBadge;
  catalog: StoreCatalog | undefined;
  joinedLabel: string | null;
}) {
  return (
    <div className="vt-card vt-card-pad">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {store.avatarUrl ? (
            <ProtectedMediaImg
              src={store.avatarUrl}
              alt=""
              wrapperClassName="mt-0.5 h-14 w-14 shrink-0"
              className="h-14 w-14 rounded-[16px] border border-[var(--border)] object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <div className="text-[22px] font-black tracking-[-0.03em]">
              {store.name}
            </div>
            <div className="vt-muted mt-1">{store.categories.join(" · ")}</div>
            {catalog?.pitch ? (
              <p className="mt-2 max-w-[720px] text-[13px] leading-snug text-[var(--text)]">
                {catalog.pitch}
              </p>
            ) : null}
            {joinedLabel ? (
              <div className="vt-muted mt-2 inline-flex items-center gap-2 text-xs font-bold">
                <Calendar size={14} aria-hidden /> En la plataforma desde{" "}
                {joinedLabel}
              </div>
            ) : null}
          </div>
        </div>
        <div>
          {store.verified ? (
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-2.5 py-2 text-xs font-black",
                "bg-[color-mix(in_oklab,var(--good)_12%,transparent)] text-[color-mix(in_oklab,var(--good)_85%,var(--text))]",
              )}
            >
              <CheckCircle2 size={16} /> Verificado
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-2.5 py-2 text-xs font-black",
                "bg-[color-mix(in_oklab,var(--bad)_10%,transparent)] text-[color-mix(in_oklab,var(--bad)_80%,var(--text))]",
              )}
            >
              <AlertTriangle size={16} /> No verificado
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-2.5 py-2 text-xs font-black",
            store.transportIncluded
              ? "border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))]"
              : "border-[color-mix(in_oklab,#d97706_40%,var(--border))] bg-[color-mix(in_oklab,#d97706_14%,var(--surface))] text-[var(--text)]",
          )}
        >
          <Truck size={16} /> Transporte{" "}
          {store.transportIncluded ? "incluido" : "NO incluido"}
        </span>
        {!store.transportIncluded ? (
          <span className="vt-muted text-[13px]">
            Etiqueta explícita para evitar dudas en el chat: el transporte no
            forma parte de la oferta salvo que se negocie en el acuerdo.
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function StorePage() {
  const { storeId } = useParams();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const me = useAppStore((s) => s.me);
  const store = useMarketStore((s) =>
    storeId ? s.stores[storeId] : undefined,
  );
  const catalog = useMarketStore((s) =>
    storeId ? s.storeCatalogs[storeId] : undefined,
  );

  const addOwnerStoreProduct = useMarketStore((s) => s.addOwnerStoreProduct);
  const updateOwnerStoreProduct = useMarketStore(
    (s) => s.updateOwnerStoreProduct,
  );
  const removeOwnerStoreProduct = useMarketStore(
    (s) => s.removeOwnerStoreProduct,
  );
  const setOwnerStoreProductPublished = useMarketStore(
    (s) => s.setOwnerStoreProductPublished,
  );
  const addOwnerStoreService = useMarketStore((s) => s.addOwnerStoreService);
  const updateOwnerStoreService = useMarketStore(
    (s) => s.updateOwnerStoreService,
  );
  const removeOwnerStoreService = useMarketStore(
    (s) => s.removeOwnerStoreService,
  );
  const setOwnerStoreServicePublished = useMarketStore(
    (s) => s.setOwnerStoreServicePublished,
  );

  const isOwner = useMemo(
    () => !!(store && me.id && store.ownerUserId === me.id),
    [store, me.id],
  );

  const [productNameQ, setProductNameQ] = useState("");
  const [productCategoryQ, setProductCategoryQ] = useState("");
  const [serviceNameQ, setServiceNameQ] = useState("");
  const [serviceCategoryQ, setServiceCategoryQ] = useState("");
  const [detailStatus, setDetailStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [loadNonce, setLoadNonce] = useState(0);
  const [productCtx, setProductCtx] = useState<{ productId?: string } | null>(
    null,
  );
  const [serviceCtx, setServiceCtx] = useState<{ serviceId?: string } | null>(
    null,
  );
  const [catalogDeleteTarget, setCatalogDeleteTarget] = useState<
    | null
    | { kind: "product"; productId: string }
    | { kind: "service"; serviceId: string }
  >(null);
  const [catalogDeleteBusy, setCatalogDeleteBusy] = useState(false);
  const [catalogReloadBusy, setCatalogReloadBusy] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState<string[]>(() => [
    ...DEFAULT_CATALOG_CATEGORIES,
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cats = await fetchCatalogCategories();
        if (!cancelled && cats.length > 0) setCatalogCategories(cats);
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setProductCtx(null);
    setServiceCtx(null);
    setCatalogDeleteTarget(null);
  }, [storeId]);

  const screen = useMemo(
    () => (storeId ? screenFromPathname(pathname, storeId) : "catalog"),
    [pathname, storeId],
  );

  useEffect(() => {
    if (!storeId) return;
    if (!useMarketStore.getState().stores[storeId]) return;
    let cancelled = false;
    setDetailStatus("loading");
    void (async () => {
      try {
        const data = await fetchStoreDetail(storeId, { userId: me.id });
        if (cancelled) return;
        useMarketStore.setState((s) => ({
          stores: { ...s.stores, [storeId]: data.store },
          storeCatalogs: { ...s.storeCatalogs, [storeId]: data.catalog },
        }));
        setDetailStatus("ready");
      } catch {
        if (!cancelled) setDetailStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId, me.id, loadNonce]);

  const publishedProducts = useMemo(
    () => (catalog?.products ?? []).filter((p) => p.published),
    [catalog],
  );
  const publishedServices = useMemo(
    () => (catalog?.services ?? []).filter((s) => s.published !== false),
    [catalog],
  );

  const productCategoryOptions = useMemo(
    () => uniqueSorted(publishedProducts.map((p) => p.category)),
    [publishedProducts],
  );
  const serviceCategoryOptions = useMemo(
    () => uniqueSorted(publishedServices.map((s) => s.category)),
    [publishedServices],
  );

  const filteredPublishedProducts = useMemo(
    () =>
      publishedProducts.filter(
        (p) =>
          (matchesNameQuery(p.name, productNameQ) ||
            matchesNameQuery(p.model ?? "", productNameQ)) &&
          matchesCategoryFilter(p.category, productCategoryQ),
      ),
    [publishedProducts, productNameQ, productCategoryQ],
  );

  const filteredPublishedServices = useMemo(
    () =>
      publishedServices.filter(
        (s) =>
          (matchesNameQuery(s.tipoServicio, serviceNameQ) ||
            matchesNameQuery(s.descripcion, serviceNameQ)) &&
          matchesCategoryFilter(s.category, serviceCategoryQ),
      ),
    [publishedServices, serviceNameQ, serviceCategoryQ],
  );

  const allCatalogProducts = useMemo(() => catalog?.products ?? [], [catalog]);
  const allCatalogServices = useMemo(() => catalog?.services ?? [], [catalog]);

  const ownerProductCategoryOptions = useMemo(
    () => uniqueSorted(allCatalogProducts.map((p) => p.category)),
    [allCatalogProducts],
  );
  const ownerServiceCategoryOptions = useMemo(
    () => uniqueSorted(allCatalogServices.map((s) => s.category)),
    [allCatalogServices],
  );

  const filteredOwnerProducts = useMemo(
    () =>
      allCatalogProducts.filter(
        (p) =>
          (matchesNameQuery(p.name, productNameQ) ||
            matchesNameQuery(p.model ?? "", productNameQ)) &&
          matchesCategoryFilter(p.category, productCategoryQ),
      ),
    [allCatalogProducts, productNameQ, productCategoryQ],
  );

  const filteredOwnerServices = useMemo(
    () =>
      allCatalogServices.filter(
        (s) =>
          (matchesNameQuery(s.tipoServicio, serviceNameQ) ||
            matchesNameQuery(s.descripcion, serviceNameQ)) &&
          matchesCategoryFilter(s.category, serviceCategoryQ),
      ),
    [allCatalogServices, serviceNameQ, serviceCategoryQ],
  );

  const joinedLabel = catalog
    ? new Intl.DateTimeFormat("es", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(catalog.joinedAt)
    : null;

  if (!storeId || !store) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Tienda no encontrada.</div>
      </div>
    );
  }

  const sid: string = storeId;

  if (detailStatus === "loading") {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad flex flex-col items-center justify-center gap-2 py-20 text-center">
          <div className="text-lg font-black tracking-[-0.02em]">
            Cargando tienda…
          </div>
          <div className="max-w-[360px] text-sm text-[var(--muted)]">
            Obteniendo catálogo y datos públicos según tu perfil.
          </div>
        </div>
      </div>
    );
  }

  if (detailStatus === "error") {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad flex flex-col items-center gap-4 py-16 text-center">
          <div className="font-bold">
            No se pudieron cargar los datos de la tienda.
          </div>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={() => setLoadNonce((n) => n + 1)}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  function goTo(next: StoreScreen) {
    const base = `/store/${sid}`;
    const path =
      next === "catalog"
        ? base
        : next === "vitrina"
          ? `${base}/vitrina`
          : next === "products"
            ? `${base}/products`
            : `${base}/services`;
    nav(path);
  }

  function goBack() {
    nav(-1);
  }

  const ownerId = store.ownerUserId;

  async function reloadStoreCatalogFromServer() {
    if (!storeId || !me.id) return;
    setCatalogReloadBusy(true);
    try {
      const data = await fetchStoreDetail(sid, { userId: me.id });
      useMarketStore.setState((s) => ({
        ...s,
        stores: { ...s.stores, [sid]: data.store },
        storeCatalogs: { ...s.storeCatalogs, [sid]: data.catalog },
      }));
      toast.success("Catálogo actualizado");
    } catch {
      toast.error("No se pudo actualizar el catálogo");
    } finally {
      setCatalogReloadBusy(false);
    }
  }

  const productEditing =
    productCtx && productCtx.productId && catalog
      ? catalog.products.find((p) => p.id === productCtx.productId)
      : undefined;

  const serviceEditing =
    serviceCtx && serviceCtx.serviceId && catalog
      ? catalog.services.find((s) => s.id === serviceCtx.serviceId)
      : undefined;

  const headerTitle =
    screen === "catalog"
      ? store.name
      : screen === "vitrina"
        ? "Vitrina"
        : screen === "products"
          ? "Productos"
          : "Servicios";

  const vitrinaFiltersProps = {
    productNameQ,
    onProductNameQ: setProductNameQ,
    productCategory: productCategoryQ,
    onProductCategory: setProductCategoryQ,
    productCategories: productCategoryOptions,
    serviceNameQ,
    onServiceNameQ: setServiceNameQ,
    serviceCategory: serviceCategoryQ,
    onServiceCategory: setServiceCategoryQ,
    serviceCategories: serviceCategoryOptions,
  };

  const catalogProductTile = (
    <button
      type="button"
      onClick={() => goTo("products")}
      className={cn(
        "flex min-w-[min(100%,240px)] flex-1 snap-start flex-col gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors",
        "hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]">
          <Package size={20} className="text-[var(--primary)]" aria-hidden />
        </span>
        <ChevronRight
          size={18}
          className="shrink-0 text-[var(--muted)]"
          aria-hidden
        />
      </div>
      <div>
        <div className="font-black tracking-[-0.02em]">Productos</div>
        <div className="vt-muted mt-1 text-[12px] leading-snug">
          {publishedProducts.length} publicados en vitrina
        </div>
      </div>
    </button>
  );

  const catalogServiceTile = (
    <button
      type="button"
      onClick={() => goTo("services")}
      className={cn(
        "flex min-w-[min(100%,240px)] flex-1 snap-start flex-col gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors",
        "hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]">
          <Wrench size={20} className="text-[var(--primary)]" aria-hidden />
        </span>
        <ChevronRight
          size={18}
          className="shrink-0 text-[var(--muted)]"
          aria-hidden
        />
      </div>
      <div>
        <div className="font-black tracking-[-0.02em]">Servicios</div>
        <div className="vt-muted mt-1 text-[12px] leading-snug">
          {publishedServices.length} publicados en vitrina
        </div>
      </div>
    </button>
  );

  return (
    <div className="container vt-page relative pb-24">
      <div className="flex flex-col gap-3.5">
        {isOwner ? (
          <datalist id="store-cat-hints">
            {catalogCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        ) : null}
        <div className="vt-card vt-card-pad">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={backRowBtnClass}
              onClick={goBack}
              aria-label={screen === "catalog" ? "Volver" : "Atrás"}
              style={{
                minWidth: 40,
                minHeight: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="min-w-0 truncate text-lg font-black tracking-[-0.03em]">
              {headerTitle}
            </h1>
          </div>
        </div>

        {screen === "catalog" ? (
          <>
            <StoreIdentityBlock
              store={store}
              catalog={catalog}
              joinedLabel={joinedLabel}
            />
            <div className="vt-card vt-card-pad">
              <div className="vt-h2">Catálogo de la tienda</div>
              <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                Elegí Productos o Servicios: ahí están los filtros y el listado.
                {isOwner
                  ? " Como dueño también gestionás ítems (borradores y publicados)."
                  : " Solo ves lo publicado en vitrina."}
              </p>
              <div className="vt-divider my-3" />
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[560px]:flex-nowrap min-[560px]:overflow-visible">
                {catalogProductTile}
                {catalogServiceTile}
              </div>
            </div>
            <button
              type="button"
              className="fixed right-4 z-[65] inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-black shadow-[0_12px_40px_rgba(2,6,23,0.2)] transition hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] min-[480px]:right-8 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]"
              onClick={() => goTo("vitrina")}
            >
              <LayoutGrid
                size={20}
                className="text-[var(--primary)]"
                aria-hidden
              />
              Ver vitrina
            </button>
          </>
        ) : null}

        {screen === "vitrina" ? (
          <>
            <StoreIdentityBlock
              store={store}
              catalog={catalog}
              joinedLabel={joinedLabel}
            />
            <div className="vt-card vt-card-pad flex flex-col gap-4">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Vitrina pública
                </div>
                <p className="vt-muted mt-1 max-w-[720px] text-[13px] leading-snug">
                  Vista rápida de productos y servicios publicados en vitrina.
                  Usá los filtros para acotar.
                </p>
              </div>
              <VitrinaFiltersCard {...vitrinaFiltersProps} />

              {filteredPublishedProducts.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                      Productos
                    </span>
                    <button
                      type="button"
                      className="vt-btn vt-btn-ghost vt-btn-sm"
                      onClick={() => goTo("products")}
                    >
                      Ver todos
                    </button>
                  </div>
                  <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {filteredPublishedProducts.slice(0, 14).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => goTo("products")}
                        className="flex w-[148px] shrink-0 snap-start flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface)] text-left transition-colors hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]"
                      >
                        <div className="relative h-[88px] bg-[color-mix(in_oklab,var(--bg)_75%,var(--surface))]">
                          {p.photoUrls[0] ? (
                            <ProtectedMediaImg
                              src={p.photoUrls[0]}
                              alt=""
                              wrapperClassName="absolute inset-0 h-full w-full"
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-[var(--muted)]">
                              <Package size={22} aria-hidden />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="line-clamp-2 text-[12px] font-bold leading-snug">
                            {p.name}
                          </div>
                          <div className="vt-muted mt-0.5 truncate text-[11px] font-semibold">
                            {p.price}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {filteredPublishedServices.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                      Servicios
                    </span>
                    <button
                      type="button"
                      className="vt-btn vt-btn-ghost vt-btn-sm"
                      onClick={() => goTo("services")}
                    >
                      Ver todos
                    </button>
                  </div>
                  <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {filteredPublishedServices.slice(0, 14).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => goTo("services")}
                        className="min-w-[min(100%,200px)] shrink-0 snap-start rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2 text-left transition-colors hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]"
                      >
                        <div className="flex items-start gap-2">
                          <Wrench
                            size={16}
                            className="mt-0.5 shrink-0 text-[var(--muted)]"
                            aria-hidden
                          />
                          <span className="min-w-0">
                            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                              {s.category}
                            </span>
                            <span className="mt-0.5 block text-[13px] font-bold leading-snug">
                              {s.tipoServicio}
                            </span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {filteredPublishedProducts.length === 0 &&
              filteredPublishedServices.length === 0 ? (
                <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                  {publishedProducts.length === 0 &&
                  publishedServices.length === 0
                    ? "Esta tienda aún no tiene contenido publicado en vitrina."
                    : "Ningún resultado con los filtros actuales. Probá otro nombre o categoría."}
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        {screen === "products" ? (
          <>
            <ProductFiltersCard
              productNameQ={productNameQ}
              onProductNameQ={setProductNameQ}
              productCategory={productCategoryQ}
              onProductCategory={setProductCategoryQ}
              productCategories={
                isOwner ? ownerProductCategoryOptions : productCategoryOptions
              }
            />
            <div className="vt-card vt-card-pad">
              {isOwner ? (
                <>
                  <div className="vt-h2">Gestionar productos</div>
                  <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                    Borradores y publicados. Publicá para que aparezcan en la
                    vitrina.
                  </p>
                  <div className="vt-divider my-3" />
                  <OwnerCatalogProductList
                    showSectionLabel={false}
                    className="mt-0 border-0 pt-0"
                    cat={catalog}
                    productsOverride={filteredOwnerProducts}
                    catalogReloadBusy={catalogReloadBusy}
                    onReload={() => void reloadStoreCatalogFromServer()}
                    onAdd={() => setProductCtx({})}
                    onEdit={(productId) => setProductCtx({ productId })}
                    onRemove={(productId) =>
                      setCatalogDeleteTarget({ kind: "product", productId })
                    }
                    onTogglePublished={(productId, published) => {
                      if (
                        setOwnerStoreProductPublished(
                          sid,
                          ownerId,
                          productId,
                          published,
                        )
                      ) {
                        toast.success(
                          published
                            ? "Producto publicado en la tienda"
                            : "Producto oculto de la tienda",
                        );
                      } else {
                        toast.error("No se pudo actualizar");
                      }
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="vt-h2">Todos los productos</div>
                  <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                    Solo se listan productos publicados en la vitrina (respetan
                    el filtro de arriba).
                  </p>
                  <div className="vt-divider my-3" />
                  {filteredPublishedProducts.length ? (
                    <div className="flex flex-col gap-3">
                      {filteredPublishedProducts.map((p) => (
                        <ProductDetailCard key={p.id} p={p} />
                      ))}
                    </div>
                  ) : publishedProducts.length ? (
                    <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                      Ningún producto coincide con el filtro. Ajustá nombre o
                      categoría.
                    </p>
                  ) : (
                    <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                      No hay productos publicados en la vitrina.
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        ) : null}

        {screen === "services" ? (
          <>
            <ServiceFiltersCard
              serviceNameQ={serviceNameQ}
              onServiceNameQ={setServiceNameQ}
              serviceCategory={serviceCategoryQ}
              onServiceCategory={setServiceCategoryQ}
              serviceCategories={
                isOwner ? ownerServiceCategoryOptions : serviceCategoryOptions
              }
            />
            <div className="vt-card vt-card-pad">
              {isOwner ? (
                <>
                  <div className="vt-h2">Gestionar servicios</div>
                  <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                    Borradores y publicados. Publicá para que aparezcan en la
                    vitrina.
                  </p>
                  <div className="vt-divider my-3" />
                  <OwnerCatalogServiceList
                    showSectionLabel={false}
                    className="mt-0 border-0 pt-0"
                    cat={catalog}
                    servicesOverride={filteredOwnerServices}
                    catalogReloadBusy={catalogReloadBusy}
                    onReload={() => void reloadStoreCatalogFromServer()}
                    onAdd={() => setServiceCtx({})}
                    onEdit={(serviceId) => setServiceCtx({ serviceId })}
                    onRemove={(serviceId) =>
                      setCatalogDeleteTarget({ kind: "service", serviceId })
                    }
                    onTogglePublished={(serviceId, published) => {
                      if (
                        setOwnerStoreServicePublished(
                          sid,
                          ownerId,
                          serviceId,
                          published,
                        )
                      ) {
                        toast.success(
                          published
                            ? "Servicio publicado en la tienda"
                            : "Servicio oculto de la tienda",
                        );
                      } else {
                        toast.error("No se pudo actualizar");
                      }
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="vt-h2">Todos los servicios</div>
                  <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                    Solo se listan servicios publicados en la vitrina (respetan
                    el filtro de arriba).
                  </p>
                  <div className="vt-divider my-3" />
                  {filteredPublishedServices.length ? (
                    <div className="flex flex-col gap-3">
                      {filteredPublishedServices.map((s) => (
                        <ServiceDetailCard key={s.id} s={s} />
                      ))}
                    </div>
                  ) : publishedServices.length ? (
                    <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                      Ningún servicio coincide con el filtro. Ajustá nombre o
                      categoría.
                    </p>
                  ) : (
                    <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                      No hay servicios publicados en la vitrina.
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        ) : null}

        <ConfirmDeleteModal
          open={catalogDeleteTarget !== null}
          title={
            catalogDeleteTarget?.kind === "product"
              ? "Eliminar producto"
              : catalogDeleteTarget?.kind === "service"
                ? "Eliminar servicio"
                : "Eliminar"
          }
          message={
            catalogDeleteTarget?.kind === "product"
              ? "¿Quitar este producto del catálogo de la tienda?"
              : catalogDeleteTarget?.kind === "service"
                ? "¿Quitar este servicio del catálogo de la tienda?"
                : "¿Confirmás eliminar?"
          }
          confirmBusy={catalogDeleteBusy}
          onCancel={() => {
            if (catalogDeleteBusy) return;
            setCatalogDeleteTarget(null);
          }}
          onConfirm={() => {
            if (!catalogDeleteTarget || catalogDeleteBusy) return;
            setCatalogDeleteBusy(true);
            try {
              if (catalogDeleteTarget.kind === "product") {
                const ok = removeOwnerStoreProduct(
                  sid,
                  ownerId,
                  catalogDeleteTarget.productId,
                );
                if (ok) {
                  toast.success("Producto quitado");
                  setCatalogDeleteTarget(null);
                } else {
                  toast.error("No se pudo quitar");
                }
              } else if (catalogDeleteTarget.kind === "service") {
                const ok = removeOwnerStoreService(
                  sid,
                  ownerId,
                  catalogDeleteTarget.serviceId,
                );
                if (ok) {
                  toast.success("Servicio quitado");
                  setCatalogDeleteTarget(null);
                } else {
                  toast.error("No se pudo quitar");
                }
              }
            } finally {
              setCatalogDeleteBusy(false);
            }
          }}
        />

        {productCtx !== null ? (
          <ProductEditorModal
            key={`${sid}-product-${productCtx.productId ?? "new"}`}
            open
            title={productEditing ? "Editar producto" : "Añadir producto"}
            initial={
              productEditing
                ? {
                    category: productEditing.category,
                    name: productEditing.name,
                    model: productEditing.model,
                    shortDescription: productEditing.shortDescription,
                    mainBenefit: productEditing.mainBenefit,
                    technicalSpecs: productEditing.technicalSpecs,
                    condition: productEditing.condition,
                    price: productEditing.price,
                    taxesShippingInstall: productEditing.taxesShippingInstall,
                    availability: productEditing.availability,
                    warrantyReturn: productEditing.warrantyReturn,
                    contentIncluded: productEditing.contentIncluded,
                    usageConditions: productEditing.usageConditions,
                    photoUrls: productEditing.photoUrls,
                    published: productEditing.published,
                    customFields: productEditing.customFields.length
                      ? productEditing.customFields
                      : [],
                  }
                : emptyStoreProductInput()
            }
            onClose={() => setProductCtx(null)}
            onSave={(input) => {
              if (productCtx.productId) {
                updateOwnerStoreProduct(
                  sid,
                  ownerId,
                  productCtx.productId,
                  input,
                );
                toast.success("Producto actualizado");
              } else {
                addOwnerStoreProduct(sid, ownerId, input);
                toast.success("Producto añadido");
              }
            }}
          />
        ) : null}

        {serviceCtx !== null ? (
          <ServiceEditorModal
            key={`${sid}-service-${serviceCtx.serviceId ?? "new"}`}
            open
            title={serviceEditing ? "Editar servicio" : "Añadir servicio"}
            initial={
              serviceEditing
                ? {
                    published: serviceEditing.published !== false,
                    category: serviceEditing.category,
                    tipoServicio: serviceEditing.tipoServicio,
                    descripcion: serviceEditing.descripcion,
                    riesgos: { ...serviceEditing.riesgos },
                    incluye: serviceEditing.incluye,
                    noIncluye: serviceEditing.noIncluye,
                    dependencias: { ...serviceEditing.dependencias },
                    entregables: serviceEditing.entregables,
                    garantias: { ...serviceEditing.garantias },
                    propIntelectual: serviceEditing.propIntelectual,
                    customFields: serviceEditing.customFields.length
                      ? serviceEditing.customFields
                      : [],
                  }
                : emptyStoreServiceInput()
            }
            onClose={() => setServiceCtx(null)}
            onSave={(input) => {
              if (serviceCtx.serviceId) {
                updateOwnerStoreService(
                  sid,
                  ownerId,
                  serviceCtx.serviceId,
                  input,
                );
                toast.success("Servicio actualizado");
              } else {
                addOwnerStoreService(sid, ownerId, input);
                toast.success("Servicio añadido");
              }
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
