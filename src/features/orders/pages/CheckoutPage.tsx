import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Truck } from "lucide-react";
import { useCheckout } from "../logic/useCheckout";
import { priceTag } from "../logic/formatMoney";
import type { OrderDeliveryMode } from "../Dtos/orders";
import { DeliveryDataModal } from "../components/DeliveryDataModal";
import { CheckoutSectionBadge } from "../components/CheckoutSectionBadge";
import { CheckoutPayButton } from "../components/CheckoutPayButton";
import { CheckoutPaymentSuccess } from "../components/CheckoutPaymentSuccess";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { storeProductHref } from "@features/market/logic/store/storePath";
import { StorefrontChrome } from "@features/storefront";
import { ProfileButton } from "@features/profile/components/ProfileButton";
import { cartLineKey } from "../logic/cartStore";

const checkoutSection =
  "rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8";
const checkoutInset =
  "rounded-[10px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_42%,var(--surface))] px-4 py-4";
const checkoutCallout =
  "mt-6 flex items-start gap-3 rounded-[10px] border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] px-4 py-4";
const checkoutActionBtn =
  "mt-4 w-full rounded-[10px] border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface))] py-3 text-sm font-bold text-[var(--primary)] transition hover:bg-[color-mix(in_oklab,var(--primary)_18%,var(--surface))]";

export function CheckoutPage() {
  const {
    store,
    backHref,
    items,
    isEmpty,
    mode,
    setMode,
    delivery,
    deliveryModalOpen,
    openDeliveryModal,
    closeDeliveryModal,
    confirmDelivery,
    needsAddress,
    pinReady,
    deliveryComplete,
    deliveryAddressLine,
    preview,
    previewLoading,
    previewError,
    subtotal,
    summaryCurrency,
    hasProducts,
    isCreating,
    paymentSuccess,
    submit,
  } = useCheckout();

  const wrap = (node: ReactNode): ReactNode =>
    store ? <StorefrontChrome store={store}>{node}</StorefrontChrome> : node;

  if (paymentSuccess) {
    return wrap(
      <CheckoutPaymentSuccess
        publicNumber={paymentSuccess.publicNumber}
        continueShoppingHref={backHref}
      />,
    );
  }

  if (isEmpty) {
    return wrap(
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center shadow-[var(--shadow)]">
          <p className="text-base font-semibold text-[var(--text)]">
            No hay productos en el carrito.
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Añade artículos antes de pagar.
          </p>
          <Link to={backHref} className="mt-6 inline-block">
            <ProfileButton variant="primary" className="h-12 rounded-full px-7">
              {store ? "Volver a la tienda" : "Volver al catálogo"}
            </ProfileButton>
          </Link>
        </div>
      </div>,
    );
  }

  return wrap(
    <div className="mx-auto w-full max-w-[1140px] px-4 py-6 pb-10 sm:py-10">
      <DeliveryDataModal
        open={deliveryModalOpen}
        mode={mode}
        initial={delivery}
        onClose={closeDeliveryModal}
        onConfirm={confirmDelivery}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl lg:text-[2.6rem]">
          Finalizar compra
        </h1>
        <p className="mt-1.5 text-[0.95rem] text-[var(--muted)]">
          Revisa tu pedido y confirma el pago protegido.
        </p>
      </div>

      <form onSubmit={submit}>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-10">
          <div className="order-2 min-w-0 lg:order-1 lg:flex-[7]">
            <div className="space-y-6">
              {hasProducts ? (
              <section className={checkoutSection}>
                <div className="flex items-center gap-3">
                  <CheckoutSectionBadge n={1} />
                  <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)]">
                    Datos de entrega
                  </h2>
                </div>

                <div className="mt-6 flex gap-2">
                  {(["shipping", "pickup"] as OrderDeliveryMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex-1 rounded-[10px] border px-4 py-2.5 text-sm font-bold transition ${
                        mode === m
                          ? "border-[color-mix(in_oklab,var(--primary)_55%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_14%,var(--surface))] text-[var(--primary)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]"
                      }`}
                    >
                      {m === "shipping" ? "Envío a domicilio" : "Recoger"}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  {deliveryComplete ? (
                    <div className={checkoutInset}>
                      <p className="text-sm font-bold text-[var(--text)]">
                        {delivery.fullName.trim()}
                      </p>
                      {needsAddress && deliveryAddressLine ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {deliveryAddressLine}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {delivery.phone.trim()}
                      </p>
                      {delivery.phone2.trim() ? (
                        <p className="mt-0.5 text-sm text-[var(--muted)]">
                          {delivery.phone2.trim()}
                        </p>
                      ) : null}
                      {needsAddress && pinReady ? (
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          Pin: {delivery.latitude?.toFixed(5)},{" "}
                          {delivery.longitude?.toFixed(5)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-[var(--muted)]">
                      {needsAddress
                        ? "Completa nombre, dirección, teléfonos y ubicación en el mapa para calcular el envío."
                        : "Completa nombre y teléfono para coordinar la recogida."}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={openDeliveryModal}
                    className={checkoutActionBtn}
                  >
                    {deliveryComplete
                      ? "Editar datos de entrega"
                      : "Completar datos de entrega"}
                  </button>
                </div>
              </section>
              ) : (
              <section className={checkoutSection}>
                <div className="flex items-center gap-3">
                  <CheckoutSectionBadge n={1} />
                  <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)]">
                    Datos de contacto
                  </h2>
                </div>
                <p className="mt-4 text-sm text-[var(--muted)]">
                  Los servicios no requieren dirección de entrega. Indica nombre y
                  teléfono para el comprobante.
                </p>
                <div className="mt-6">
                  {deliveryComplete ? (
                    <div className={checkoutInset}>
                      <p className="text-sm font-bold text-[var(--text)]">
                        {delivery.fullName.trim()}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {delivery.phone.trim()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">
                      Completa nombre y teléfono de contacto.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={openDeliveryModal}
                    className={checkoutActionBtn}
                  >
                    {deliveryComplete
                      ? "Editar datos de contacto"
                      : "Completar datos de contacto"}
                  </button>
                </div>
              </section>
              )}

              <section className={checkoutSection}>
                <div className="flex items-center gap-3">
                  <CheckoutSectionBadge n={hasProducts ? 2 : 1} />
                  <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)]">
                    Método de Pago
                  </h2>
                </div>

                {previewLoading ? (
                  <p className="mt-6 text-sm text-[var(--muted)]">
                    Calculando total con envío…
                  </p>
                ) : null}

                {previewError ? (
                  <p className="mt-6 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {previewError}
                  </p>
                ) : null}

                <div className={checkoutCallout}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_16%,var(--surface))] text-[var(--primary)]">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-[var(--text)]">
                      Pago protegido
                    </p>
                    <p className="mt-1 text-sm leading-snug text-[var(--muted)]">
                      El pago se retiene como garantía y se libera al vendedor
                      cuando confirmes la entrega.
                    </p>
                  </div>
                </div>
              </section>

              <div className="lg:hidden">
                <CheckoutPayButton
                  isCreating={isCreating}
                  previewLoading={previewLoading}
                />
                <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--muted)]">
                  Al confirmar aceptas nuestros términos de servicio y política
                  de privacidad.
                </p>
              </div>
            </div>
          </div>

          <aside className="order-1 flex min-w-0 flex-col gap-4 lg:order-2 lg:flex-[3] lg:sticky lg:top-28">
            <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
              <h3 className="text-lg font-extrabold tracking-tight text-[var(--text)]">
                Resumen del pedido
              </h3>
              <div className="mt-5 space-y-4">
                {items.map((line) => {
                  const lineId =
                    line.kind === "service" ? line.serviceId : line.productId;
                  const href = lineId
                    ? storeProductHref(store, lineId)
                    : "#";
                  return (
                    <div key={cartLineKey(line)} className="flex gap-3">
                      <Link
                        to={href}
                        className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]"
                      >
                        {line.photoUrl ? (
                          <ProtectedMediaImg
                            src={line.photoUrl}
                            alt={line.name}
                            wrapperClassName="h-full w-full"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold text-[var(--muted)]">
                            —
                          </span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={href}
                          className="line-clamp-2 text-sm font-bold text-[var(--text)] transition hover:text-[var(--primary)]"
                        >
                          {line.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {line.kind === "service" ? "Servicio" : "Producto"} ·
                          Cant. {line.quantity}
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-[var(--primary)]">
                          {priceTag(line.unitPrice * line.quantity, line.currencyCode)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 space-y-2 border-t border-[var(--border)] pt-5 text-sm">
                <div className="flex justify-between text-[var(--muted)]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[var(--text)]">
                    {priceTag(preview?.subtotal ?? subtotal, summaryCurrency)}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--muted)]">
                  <span>Envío</span>
                  {preview ? (
                    <span className="font-extrabold text-[var(--primary)]">
                      {priceTag(preview.deliveryFee, preview.currencyCode)}
                    </span>
                  ) : (
                    <span className="max-w-[11rem] text-right text-sm font-medium text-[var(--muted)]">
                      {needsAddress
                        ? "Se calcula según tu ubicación"
                        : "Sin costo (recogida)"}
                    </span>
                  )}
                </div>
                {preview?.routeDistanceKm != null ? (
                  <div className="flex justify-between text-[var(--muted)]">
                    <span>Distancia</span>
                    <span className="font-semibold text-[var(--text)]">
                      {preview.routeDistanceKm.toFixed(1)} km
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex items-end justify-between border-t border-[var(--border)] pt-5">
                <span className="text-base font-extrabold text-[var(--text)]">
                  Total
                </span>
                <span className="text-right text-xl font-extrabold text-[var(--primary)]">
                  {priceTag(preview?.total ?? subtotal, summaryCurrency)}
                </span>
              </div>

              <div className="hidden lg:block">
                <CheckoutPayButton
                  isCreating={isCreating}
                  previewLoading={previewLoading}
                  className="mt-6"
                />
                <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--muted)]">
                  Al confirmar aceptas nuestros términos de servicio y política
                  de privacidad.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-10 flex gap-3 rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-4 py-4 text-sm text-[var(--muted)]">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_14%,var(--surface))] text-[var(--primary)]">
            <Truck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-extrabold text-[var(--text)]">Logística segura</p>
            <p className="mt-1 leading-snug text-[var(--muted)]">
              Seguimiento del envío y entrega coordinada. Te avisaremos en cada
              etapa.
            </p>
          </div>
        </div>
      </form>
    </div>,
  );
}
