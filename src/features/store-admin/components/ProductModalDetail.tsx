import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { Label } from "flowbite-react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { ProfileButton } from "@features/profile/components/ProfileButton";
import { ProfileModal } from "@features/profile/components/ProfileModal";
import { CeTransitionModalShell } from "@shared/components/ui";
import { toast } from "sonner";
import type {
  StoreCategoryDto,
  StoreProduct,
  StoreSupplierDto,
} from "@features/market/Dtos/storeCatalogTypes";
import { CATALOG_CURRENCY_CODE } from "@features/market/logic/storeCatalogTypes";
import { useCurrencies } from "@features/market/hooks/useCurrencies";
import {
  createStoreCategory,
  deleteStoreCategory,
} from "@features/market/api/storeInventoryApi";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { ConfirmModal } from "@shared/components/ui/ConfirmModal";
import { cn } from "@shared/lib/cn";
import { UploadBlockingOverlay } from "@shared/components/ui/UploadBlockingOverlay";
import {
  uploadMedia,
  mediaApiUrl,
  isProtectedMediaUrl,
  releaseMediaObjectUrl,
  MEDIA_MAX_BYTES,
} from "@shared/services/media/mediaClient";
import {
  newAttachmentId,
  productPhotoSlotsFromUrls,
  revokeIfBlob,
  type ProductPhotoSlot,
} from "@features/profile/logic/stores/catalogMediaHelpers";
import { assertEntityPayloadUnderLimit } from "@shared/services/media/payloadLimits";
import {
  categoryIdsEqual,
  childCategoriesOf,
  isDuplicateCategoryName,
  rootCategoriesOf,
} from "../logic/productCategoryHelpers";
import {
  formatMeasureString,
  MEASURE_UNITS,
  MEASURE_UNIT_LABELS,
  parseMeasureString,
  type MeasureUnit,
} from "../logic/productMeasure";
import {
  buildProductInput,
  expiryFromProduct,
  parsePriceInput,
  priceToInputValue,
  validateProductModalForm,
} from "../logic/productModalForm";
import { ProductModalPreview } from "./ProductModalPreview";
import {
  CE_ADMIN_BRAND,
  CE_TX_HEAD,
  CE_TX_MUTED,
  CE_UI_BG,
  CE_UI_CARD_TINT,
  CE_UI_INSET,
  CE_UI_MINT_ZONE,
  CE_UI_PRIMARY,
  CE_UI_SURFACE,
  currencyOptionLabel,
  ProductModalCheckbox,
  ProductModalDateField,
  ProductModalIconButton,
  ProductModalSelect,
  ProductModalTextField,
  PRODUCT_MODAL_CHECK_CLASS,
} from "./productModalUi";

type Props = Readonly<{
  show: boolean;
  storeId: string;
  editProduct?: StoreProduct;
  products: StoreProduct[];
  categories: StoreCategoryDto[];
  suppliers: StoreSupplierDto[];
  onRefreshCategories: () => Promise<void>;
  onClose: () => void;
  onSave: (input: Omit<StoreProduct, "id" | "storeId">) => boolean | void | Promise<boolean | void>;
}>;

export function ProductModalDetail({
  show,
  storeId,
  editProduct,
  products,
  categories,
  suppliers,
  onRefreshCategories,
  onClose,
  onSave,
}: Props) {
  const photoInputId = useId();
  const editingId = editProduct?.id ?? null;
  const { data: currencyCodes = [] } = useCurrencies({ enabled: show });

  const resolvedProduct = useMemo(() => {
    if (!editProduct) return undefined;
    return products.find((p) => categoryIdsEqual(p.id, editProduct.id)) ?? editProduct;
  }, [editProduct, products]);

  const currencies = useMemo(() => {
    const codes =
      currencyCodes.length > 0 ? currencyCodes : [CATALOG_CURRENCY_CODE];
    return codes.map((code) => ({ code, label: currencyOptionLabel(code) }));
  }, [currencyCodes]);

  const [name, setName] = useState("");
  const [priceInput, setPriceInput] = useState("1");
  const [currencyCode, setCurrencyCode] = useState(CATALOG_CURRENCY_CODE);
  const [measureEnabled, setMeasureEnabled] = useState(true);
  const [measureValue, setMeasureValue] = useState("1");
  const [measureUnit, setMeasureUnit] = useState<MeasureUnit>("L");
  const [desc, setDesc] = useState("");
  const [stock, setStock] = useState(10);
  const [supplierId, setSupplierId] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);
  const [published, setPublished] = useState(true);
  const [expiryDate, setExpiryDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [newRootCategoryName, setNewRootCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [photoSlots, setPhotoSlots] = useState<ProductPhotoSlot[]>([]);
  const [primaryPhotoId, setPrimaryPhotoId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [photoPendingCount, setPhotoPendingCount] = useState(0);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{
    src: string;
    title: string;
  } | null>(null);

  const rootCategories = useMemo(() => rootCategoriesOf(categories), [categories]);
  const childCategories = useMemo(
    () => (categoryId.trim() ? childCategoriesOf(categories, categoryId) : []),
    [categories, categoryId],
  );

  const subcategorySelectOptions = useMemo(() => {
    const list = [...childCategories];
    if (
      subcategoryId.trim() &&
      !list.some((c) => categoryIdsEqual(c.id, subcategoryId))
    ) {
      const fallback = categories.find((c) => categoryIdsEqual(c.id, subcategoryId));
      if (fallback) list.push(fallback);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [childCategories, categories, subcategoryId]);

  const selectedRootLabel =
    rootCategories.find((c) => categoryIdsEqual(c.id, categoryId))?.name ?? "";

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const weightOrLiters = useMemo(
    () => (measureEnabled ? formatMeasureString(measureValue, measureUnit) : ""),
    [measureEnabled, measureValue, measureUnit],
  );

  const primaryPhotoUrl = useMemo(() => {
    if (!primaryPhotoId) return photoSlots[0]?.url ?? null;
    return photoSlots.find((p) => p.id === primaryPhotoId)?.url ?? photoSlots[0]?.url ?? null;
  }, [photoSlots, primaryPhotoId]);

  const previewModel = useMemo(() => {
    const main = categories.find((c) => categoryIdsEqual(c.id, categoryId));
    const sub =
      categories.find((c) => categoryIdsEqual(c.id, subcategoryId)) ??
      childCategories.find((c) => categoryIdsEqual(c.id, subcategoryId));
    const catLabel =
      main && sub
        ? `${main.name} › ${sub.name}`
        : main
          ? main.name
          : sub
            ? sub.name
            : "—";
    const price = parsePriceInput(priceInput);
    return {
      name,
      description: desc,
      weightOrLiters,
      price: Number.isFinite(price) ? price : 0,
      currencyCode: currencyCode || CATALOG_CURRENCY_CODE,
      photoSrc: primaryPhotoUrl,
      stock: Number.isFinite(stock) ? stock : 0,
      categoryLabel: catLabel,
    };
  }, [
    name,
    desc,
    weightOrLiters,
    priceInput,
    currencyCode,
    primaryPhotoUrl,
    stock,
    categories,
    childCategories,
    categoryId,
    subcategoryId,
  ]);

  useEffect(() => {
    if (!show) return;
    const merged = resolvedProduct;
    if (merged) {
      setName(merged.name);
      setPriceInput(priceToInputValue(merged.price));
      setCurrencyCode(merged.monedaPrecio?.trim() || CATALOG_CURRENCY_CODE);
      const parsed = parseMeasureString(merged.model);
      setMeasureEnabled(Boolean((merged.model ?? "").trim()));
      setMeasureValue(parsed.value || "1");
      setMeasureUnit(parsed.unit);
      setDesc(merged.shortDescription ?? "");
      setStock(merged.stockQuantity ?? 0);
      setSupplierId(merged.supplierId ?? "");
      setPendingApproval(merged.pendingApproval ?? false);
      setPublished(merged.published !== false);
      setExpiryDate(expiryFromProduct(merged));
      setCategoryId(merged.categoryId || merged.categoryIds?.[0] || "");
      setSubcategoryId(merged.subcategoryId || merged.categoryIds?.[1] || "");
      const slots = productPhotoSlotsFromUrls(merged.photoUrls);
      setPhotoSlots(slots);
      setPrimaryPhotoId(slots[0]?.id ?? null);
    } else {
      setName("");
      setPriceInput("1");
      setCurrencyCode(currencies[0]?.code ?? CATALOG_CURRENCY_CODE);
      setMeasureEnabled(true);
      setMeasureValue("1");
      setMeasureUnit("L");
      setDesc("");
      setStock(10);
      setSupplierId(suppliers[0]?.id ?? "");
      setPendingApproval(false);
      setPublished(true);
      setExpiryDate("");
      setCategoryId("");
      setSubcategoryId("");
      setPhotoSlots([]);
      setPrimaryPhotoId(null);
    }
    setNewRootCategoryName("");
    setNewSubcategoryName("");
    setFormErrors({});
  }, [show, editProduct?.id, resolvedProduct, suppliers, currencies]);

  useEffect(() => {
    if (!supplierId && suppliers[0]) setSupplierId(suppliers[0].id);
  }, [suppliers, supplierId]);

  useEffect(() => {
    if (!currencyCode && currencies[0]) setCurrencyCode(currencies[0].code);
  }, [currencies, currencyCode]);

  const clearError = useCallback((key: string) => {
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  function onPickPhotos(e: ChangeEvent<HTMLInputElement>) {
    void (async () => {
      const picked = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = "";
      if (!picked.length) return;
      const images = picked.filter((f) => f.type.startsWith("image/"));
      for (const f of picked) {
        if (!f.type.startsWith("image/")) toast.error(`No es imagen: ${f.name}`);
      }
      if (!images.length) return;
      setPhotoPendingCount(images.length);
      setUploadBusy(true);
      try {
        const added: ProductPhotoSlot[] = [];
        for (const file of images) {
          if (file.size > MEDIA_MAX_BYTES) {
            toast.error(`Imagen demasiado grande: ${file.name}`);
            continue;
          }
          try {
            const uploaded = await uploadMedia(file);
            added.push({
              id: newAttachmentId(),
              url: mediaApiUrl(uploaded.id),
              fileName: file.name,
              contentKind: "image",
            });
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : `No se pudo subir: ${file.name}`,
            );
          } finally {
            setPhotoPendingCount((c) => Math.max(0, c - 1));
          }
        }
        if (!added.length) return;
        setPhotoSlots((prev) => {
          const next = [...prev, ...added];
          if (!primaryPhotoId && next[0]) setPrimaryPhotoId(next[0].id);
          return next;
        });
      } finally {
        setUploadBusy(false);
        setPhotoPendingCount(0);
      }
    })();
  }

  function removePhoto(slotId: string) {
    setPhotoSlots((prev) => {
      const slot = prev.find((p) => p.id === slotId);
      if (slot) {
        if (isProtectedMediaUrl(slot.url)) releaseMediaObjectUrl(slot.url);
        revokeIfBlob(slot.url);
      }
      const next = prev.filter((p) => p.id !== slotId);
      setPrimaryPhotoId((cur) => {
        if (cur !== slotId) return cur;
        return next[0]?.id ?? null;
      });
      return next;
    });
  }

  async function handleCreateRootCategory() {
    const n = newRootCategoryName.trim();
    if (!n) {
      toast.error("Escribe el nombre de la categoría.");
      return;
    }
    if (isDuplicateCategoryName(categories, n, null)) {
      toast.error("Ya existe una categoría raíz con ese nombre.");
      return;
    }
    setCategoryBusy(true);
    try {
      const created = await createStoreCategory(storeId, { name: n, parentCategoryId: null });
      await onRefreshCategories();
      setCategoryId(created.id);
      setSubcategoryId("");
      setNewRootCategoryName("");
      toast.success(`Categoría «${n}» creada.`);
    } catch {
      toast.error("No se pudo crear la categoría.");
    } finally {
      setCategoryBusy(false);
    }
  }

  async function handleCreateSubcategory() {
    const parent = categoryId.trim();
    if (!parent) {
      toast.error("Primero elige una categoría.");
      return;
    }
    const n = newSubcategoryName.trim();
    if (!n) {
      toast.error("Escribe el nombre de la subcategoría.");
      return;
    }
    if (isDuplicateCategoryName(categories, n, parent)) {
      toast.error("Ya existe esa subcategoría bajo esta categoría.");
      return;
    }
    setCategoryBusy(true);
    try {
      const created = await createStoreCategory(storeId, {
        name: n,
        parentCategoryId: parent,
      });
      await onRefreshCategories();
      setSubcategoryId(created.id);
      setNewSubcategoryName("");
      toast.success(`Subcategoría «${n}» creada.`);
    } catch {
      toast.error("No se pudo crear la subcategoría.");
    } finally {
      setCategoryBusy(false);
    }
  }

  async function handleDeleteRootCategory() {
    const id = categoryId.trim();
    if (!id) return;
    const label = rootCategories.find((c) => categoryIdsEqual(c.id, id))?.name ?? "esta categoría";
    if (!window.confirm(`¿Eliminar la categoría «${label}»?`)) return;
    setCategoryBusy(true);
    try {
      await deleteStoreCategory(storeId, id);
      await onRefreshCategories();
      setCategoryId("");
      setSubcategoryId("");
      toast.success("Categoría eliminada.");
    } catch {
      toast.error("No se pudo eliminar la categoría.");
    } finally {
      setCategoryBusy(false);
    }
  }

  async function handleDeleteSubcategory() {
    const id = subcategoryId.trim();
    if (!id) return;
    const label =
      subcategorySelectOptions.find((c) => categoryIdsEqual(c.id, id))?.name ??
      "esta subcategoría";
    if (!window.confirm(`¿Eliminar la subcategoría «${label}»?`)) return;
    setCategoryBusy(true);
    try {
      await deleteStoreCategory(storeId, id);
      await onRefreshCategories();
      setSubcategoryId("");
      toast.success("Subcategoría eliminada.");
    } catch {
      toast.error("No se pudo eliminar la subcategoría.");
    } finally {
      setCategoryBusy(false);
    }
  }

  function orderedPhotoUrls(): string[] {
    if (!photoSlots.length) return [];
    if (!primaryPhotoId) return photoSlots.map((p) => p.url);
    const primary = photoSlots.find((p) => p.id === primaryPhotoId);
    const rest = photoSlots.filter((p) => p.id !== primaryPhotoId);
    return primary ? [primary.url, ...rest.map((p) => p.url)] : photoSlots.map((p) => p.url);
  }

  function validate(): boolean {
    const errors = validateProductModalForm({
      name,
      priceInput,
      currencyCode,
      measureEnabled,
      measureValue,
      stock,
      supplierId,
      requireSupplier: suppliers.length > 0,
      categoryId,
      subcategoryId,
      childCategoriesLoading: false,
      subcategoryOptionsCount: subcategorySelectOptions.length,
    });
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error(
        errors.price ??
          errors.name ??
          errors.subcategory ??
          errors.category ??
          errors.supplierId ??
          errors.currencyId ??
          errors.stock ??
          errors.weight ??
          "Corrige los campos del formulario.",
      );
      return false;
    }
    return true;
  }

  function requestSubmit() {
    if (!validate()) return;
    if (editingId) {
      setShowSaveConfirm(true);
      return;
    }
    void submitProduct();
  }

  async function submitProduct() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const urls = orderedPhotoUrls();
      const input = buildProductInput({
        name,
        priceInput,
        currencyCode,
        desc,
        weightOrLiters,
        stock,
        supplierId,
        pendingApproval,
        published,
        expiryDate,
        categoryId,
        subcategoryId,
        categories,
        photoUrls: urls,
        existing: resolvedProduct,
      });
      const limitErr = assertEntityPayloadUnderLimit(input, "Este producto");
      if (limitErr) {
        toast.error(limitErr);
        return;
      }
      const saved = await onSave(input);
      if (saved === false) return;
      setShowSaveConfirm(false);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!show) return null;

  return (
    <>
      <CeTransitionModalShell
        show={show}
        onClose={() => !submitting && onClose()}
        size="7xl"
      >
        <div
          className={cn(
            "vt-admin-modal-panel relative flex max-h-[min(92vh,52rem)] w-full flex-col overflow-hidden",
          )}
        >
          <UploadBlockingOverlay
            active={uploadBusy}
            message={
              photoPendingCount > 0
                ? `Subiendo imágenes… (${photoPendingCount})`
                : "Subiendo imágenes…"
            }
          />

          <div className="relative flex items-start gap-4 border-b border-[var(--border)] px-4 pb-4 pt-4 sm:px-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--primary)_14%,var(--surface))] shadow-inner ring-1 ring-[color-mix(in_oklab,var(--primary)_25%,var(--border))]">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold leading-none text-white shadow-sm"
                style={{ backgroundColor: CE_ADMIN_BRAND }}
              >
                +
              </span>
            </span>
            <div className="min-w-0 flex-1 space-y-1 pt-0.5 pr-8">
              <h2
                id="product-modal-title"
                className={cn("text-xl font-bold tracking-tight", CE_TX_HEAD)}
              >
                {editingId ? "Editar producto" : "Agregar nuevo producto"}
              </h2>
              <p className={cn("text-sm font-normal", CE_TX_MUTED)}>
                Completa los datos y las fotos; la frontal es la que verán primero en el catálogo.
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              disabled={submitting}
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] hover:text-[var(--text)] disabled:opacity-50 sm:right-6"
            >
              <X size={20} aria-hidden />
            </button>
          </div>

          <div className={cn("relative flex-1 overflow-y-auto p-4 sm:p-6", CE_UI_BG)}>
            <div className="grid gap-8 lg:grid-cols-[1fr_min(300px,34%)]">
              <div className="space-y-6">
                <div className={cn("grid grid-cols-1 gap-4 p-5 md:grid-cols-2", CE_UI_SURFACE)}>
                  <div className="md:col-span-2">
                    <ProductModalTextField
                      id="p-name"
                      label="Nombre del Producto"
                      placeholder="Ej: Café Gourmet"
                      value={name}
                      error={formErrors.name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearError("name");
                      }}
                    />
                  </div>

                  <div className={cn("md:col-span-2 space-y-4 p-4", CE_UI_INSET)}>
                    <p className={cn("text-sm font-semibold", CE_TX_HEAD)}>
                      Categoría y subcategoría
                    </p>
                    <p className={cn("text-xs", CE_TX_MUTED)}>
                      Ambos campos son obligatorios para guardar el producto.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-end gap-2">
                        <ProductModalSelect
                          id="p-category"
                          label="Categoría"
                          value={categoryId}
                          error={formErrors.category}
                          className="min-w-0 flex-1"
                          onChange={(e) => {
                            setCategoryId(e.target.value);
                            setSubcategoryId("");
                            clearError("category");
                            clearError("subcategory");
                          }}
                        >
                          <option value="">Seleccionar categoría…</option>
                          {rootCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </ProductModalSelect>
                        <ProductModalIconButton
                          aria-label="Eliminar categoría seleccionada"
                          title="Eliminar categoría"
                          disabled={categoryBusy || !categoryId.trim()}
                          onClick={() => void handleDeleteRootCategory()}
                        >
                          <Trash2 size={16} aria-hidden />
                        </ProductModalIconButton>
                      </div>
                      <div className="flex items-end gap-2">
                        <ProductModalSelect
                          id="p-subcategory"
                          label="Subcategoría"
                          value={subcategoryId}
                          disabled={!categoryId.trim()}
                          error={formErrors.subcategory}
                          className="min-w-0 flex-1"
                          onChange={(e) => {
                            setSubcategoryId(e.target.value);
                            clearError("subcategory");
                          }}
                        >
                          <option value="">
                            {!categoryId.trim()
                              ? "Primero elige una categoría"
                              : subcategorySelectOptions.length === 0
                                ? "Sin subcategorías — créalas abajo"
                                : "Seleccionar subcategoría…"}
                          </option>
                          {subcategorySelectOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </ProductModalSelect>
                        <ProductModalIconButton
                          aria-label="Eliminar subcategoría seleccionada"
                          title="Eliminar subcategoría"
                          disabled={categoryBusy || !subcategoryId.trim()}
                          onClick={() => void handleDeleteSubcategory()}
                        >
                          <Trash2 size={16} aria-hidden />
                        </ProductModalIconButton>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border)] pt-4">
                      <p className={cn("mb-3 text-xs font-semibold uppercase tracking-wide", CE_TX_MUTED)}>
                        Añadir al catálogo de categorías
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className={cn("space-y-2 rounded-lg p-3", CE_UI_INSET)}>
                          <p className={cn("text-sm font-semibold", CE_TX_HEAD)}>
                            Crear categoría nueva
                          </p>
                          <p className={cn("text-xs", CE_TX_MUTED)}>
                            Raíz (sin padre). No se permiten nombres duplicados entre categorías raíz.
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <ProductModalTextField
                              id="p-new-root-cat"
                              label="Nombre"
                              placeholder="Ej: Bebidas"
                              value={newRootCategoryName}
                              disabled={categoryBusy}
                              className="min-w-0 flex-1"
                              onChange={(e) => setNewRootCategoryName(e.target.value)}
                            />
                            <ProfileButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={categoryBusy}
                              onClick={() => void handleCreateRootCategory()}
                              className="shrink-0"
                            >
                              Crear categoría
                            </ProfileButton>
                          </div>
                        </div>
                        <div className={cn("space-y-2 rounded-lg p-3", CE_UI_INSET)}>
                          <p className={cn("text-sm font-semibold", CE_TX_HEAD)}>
                            Crear subcategoría nueva
                          </p>
                          <p className={cn("text-xs", CE_TX_MUTED)}>
                            Se crea bajo la categoría elegida arriba. No se permiten nombres duplicados bajo la misma categoría.
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <ProductModalTextField
                              id="p-new-sub-cat"
                              label="Nombre"
                              placeholder={
                                categoryId.trim()
                                  ? `Ej: bajo «${selectedRootLabel}»`
                                  : "Primero elige categoría"
                              }
                              value={newSubcategoryName}
                              disabled={categoryBusy || !categoryId.trim()}
                              className="min-w-0 flex-1"
                              onChange={(e) => setNewSubcategoryName(e.target.value)}
                            />
                            <ProfileButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={categoryBusy || !categoryId.trim()}
                              onClick={() => void handleCreateSubcategory()}
                              className="shrink-0"
                            >
                              Crear subcategoría
                            </ProfileButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ProductModalTextField
                    id="p-price"
                    label="Precio"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={priceInput}
                    error={formErrors.price}
                    onChange={(e) => {
                      setPriceInput(e.target.value);
                      clearError("price");
                    }}
                  />
                  <ProductModalSelect
                    id="p-currency"
                    label="Moneda"
                    value={currencyCode}
                    error={formErrors.currencyId}
                    onChange={(e) => {
                      setCurrencyCode(e.target.value);
                      clearError("currencyId");
                    }}
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </ProductModalSelect>

                  <div className={cn("md:col-span-2 space-y-3 p-4", CE_UI_INSET)}>
                    <div className="flex items-center gap-2">
                      <ProductModalCheckbox
                        id="p-has-measure"
                        checked={measureEnabled}
                        onChange={(e) => {
                          setMeasureEnabled(e.target.checked);
                          clearError("weight");
                        }}
                      />
                      <Label htmlFor="p-has-measure" className={cn("text-sm font-semibold", CE_TX_HEAD)}>
                        Especificar peso o volumen
                      </Label>
                    </div>
                    <p className={cn("text-xs", CE_TX_MUTED)}>
                      Activa esta opción para indicar la cantidad y elegir la unidad de medida (kg, lb, L, etc.).
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <ProductModalTextField
                        id="p-measure-value"
                        label="Cantidad"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.5"
                        value={measureValue}
                        disabled={!measureEnabled}
                        error={formErrors.weight}
                        onChange={(e) => {
                          setMeasureValue(e.target.value);
                          clearError("weight");
                        }}
                      />
                      <ProductModalSelect
                        id="p-measure-unit"
                        label="Unidad de medida"
                        value={measureUnit}
                        disabled={!measureEnabled}
                        onChange={(e) => setMeasureUnit(e.target.value as MeasureUnit)}
                      >
                        {MEASURE_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {MEASURE_UNIT_LABELS[u]}
                          </option>
                        ))}
                      </ProductModalSelect>
                    </div>
                  </div>

                  <ProductModalTextField
                    id="p-stock"
                    label="Stock inicial"
                    type="number"
                    placeholder="0"
                    value={String(stock)}
                    error={formErrors.stock}
                    onChange={(e) => {
                      setStock(Number(e.target.value));
                      clearError("stock");
                    }}
                  />
                  <ProductModalDateField
                    id="p-expiry"
                    label="Fecha de caducidad (opcional)"
                    value={expiryDate}
                    onChange={setExpiryDate}
                  />
                </div>

                <div className={cn("space-y-4 p-5", CE_UI_CARD_TINT)}>
                  <div>
                    <p className={cn("mb-1 text-sm font-semibold", CE_TX_HEAD)}>
                      Fotografías del producto
                    </p>
                    <p className={cn("text-xs leading-relaxed", CE_TX_MUTED)}>
                      Puedes subir varias imágenes. Elige cuál es la frontal: será la principal en el catálogo.
                    </p>
                  </div>

                  {photoSlots.length > 0 ? (
                    <ul className="flex flex-wrap gap-4">
                      {photoSlots.map((slot) => (
                        <li
                          key={slot.id}
                          className="relative flex w-[7.5rem] flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow)]"
                        >
                          <button
                            type="button"
                            className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
                            aria-label="Quitar imagen"
                            onClick={() => removePhoto(slot.id)}
                          >
                            ×
                          </button>
                          <button
                            type="button"
                            className="block overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            onClick={() =>
                              setPhotoPreview({ src: slot.url, title: slot.fileName || "Vista de imagen" })
                            }
                          >
                            <ProtectedMediaImg
                              src={slot.url}
                              alt=""
                              wrapperClassName="h-24 w-full"
                              className="h-24 w-full object-cover"
                            />
                          </button>
                          <label className={cn("flex cursor-pointer items-center gap-2 text-xs", CE_TX_HEAD)}>
                            <input
                              type="radio"
                              name="primary-product-photo"
                              className={PRODUCT_MODAL_CHECK_CLASS}
                              checked={primaryPhotoId === slot.id}
                              onChange={() => setPrimaryPhotoId(slot.id)}
                            />
                            Frontal
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className={cn("flex flex-col items-center justify-center px-4 py-8", CE_UI_MINT_ZONE)}>
                    <ImagePlus className="mx-auto h-10 w-10 text-[var(--primary)]" aria-hidden />
                    <p className={cn("mt-2 text-center text-xs", CE_TX_MUTED)}>
                      JPEG, PNG, WebP o GIF (puedes elegir varias a la vez)
                    </p>
                    <label className="mt-5">
                      <input
                        id={photoInputId}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="sr-only"
                        onChange={onPickPhotos}
                      />
                      <span
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition",
                          CE_UI_PRIMARY,
                        )}
                      >
                        Añadir imágenes
                      </span>
                    </label>
                  </div>
                </div>

                {suppliers.length > 0 ? (
                  <div className={cn("p-5", CE_UI_CARD_TINT)}>
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
                      Vinculación a perfil TCP
                    </p>
                    <div className="mb-4 max-w-md">
                      <ProductModalSelect
                        id="p-tcp"
                        label="PERFIL TCP"
                        value={supplierId}
                        error={formErrors.supplierId}
                        onChange={(e) => {
                          setSupplierId(e.target.value);
                          clearError("supplierId");
                        }}
                      >
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.businessName}
                          </option>
                        ))}
                      </ProductModalSelect>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <ProductModalTextField
                        id="tcp-business-ro"
                        label="Nombre del Negocio"
                        value={selectedSupplier?.businessName ?? ""}
                        placeholder="Seleccione un TCP…"
                        readOnly
                        disabled={!selectedSupplier}
                      />
                      <ProductModalTextField
                        id="tcp-phone-ro"
                        label="Teléfono de Contacto"
                        value=""
                        placeholder="+53…"
                        readOnly
                        disabled={!selectedSupplier}
                      />
                      <div className="md:col-span-2">
                        <ProductModalTextField
                          id="tcp-address-ro"
                          label="Dirección de Recogida"
                          value=""
                          placeholder="Calle, Número, e/ Calles…"
                          readOnly
                          disabled={!selectedSupplier}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <ProductModalTextField
                  id="p-desc"
                  label="Descripción (opcional)"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />

                <div className={cn("flex flex-wrap items-center gap-4 px-4 py-4", CE_UI_INSET)}>
                  <div className="flex items-center gap-2">
                    <ProductModalCheckbox
                      id="p-pending"
                      checked={pendingApproval}
                      onChange={(e) => setPendingApproval(e.target.checked)}
                    />
                    <Label htmlFor="p-pending" className={cn("text-sm", CE_TX_HEAD)}>
                      Pendiente de aprobación
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProductModalCheckbox
                      id="p-available"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                    />
                    <Label htmlFor="p-available" className={cn("text-sm", CE_TX_HEAD)}>
                      Visible en catálogo (disponible)
                    </Label>
                  </div>
                </div>
              </div>

              <div className={cn("p-5 lg:pl-8", CE_UI_CARD_TINT)}>
                <p className={cn("text-xs font-bold uppercase tracking-[0.12em]", CE_TX_HEAD)}>
                  Vista previa en tienda (feed)
                </p>
                <p className={cn("mt-1 text-xs leading-relaxed", CE_TX_MUTED)}>
                  Así verán la tarjeta los clientes en el catálogo público.
                </p>
                <ProductModalPreview
                  model={previewModel}
                  className="mx-auto mt-5 max-w-sm lg:mx-0"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
            <ProfileButton variant="ghost" disabled={submitting} onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </ProfileButton>
            <ProfileButton
              variant="primary"
              loading={submitting}
              onClick={() => void requestSubmit()}
              className="w-full sm:w-auto"
            >
              {editingId ? "Guardar cambios" : "Guardar producto"}
            </ProfileButton>
          </div>
        </div>
      </CeTransitionModalShell>

      {photoPreview ? (
        <ProfileModal
          show
          onClose={() => setPhotoPreview(null)}
          title={photoPreview.title}
          size="4xl"
          bodyClassName="overflow-visible max-h-none"
          footer={
            <ProfileButton variant="primary" onClick={() => setPhotoPreview(null)}>
              Cerrar
            </ProfileButton>
          }
        >
          <ProtectedMediaImg
            src={photoPreview.src}
            alt=""
            wrapperClassName="mx-auto max-h-[min(80vh,880px)] w-full overflow-hidden rounded-lg"
            className="mx-auto max-h-[min(80vh,880px)] w-full object-contain"
          />
        </ProfileModal>
      ) : null}

      <ConfirmModal
        open={showSaveConfirm}
        title="Confirmar cambios del producto"
        message="¿Aplicar estos cambios al producto?"
        confirmBusy={submitting}
        onCancel={() => !submitting && setShowSaveConfirm(false)}
        onConfirm={() => void submitProduct()}
      />
    </>
  );
}
