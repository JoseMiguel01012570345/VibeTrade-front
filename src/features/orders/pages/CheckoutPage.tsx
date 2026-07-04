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
import { cartLineKey } from "../logic/cartStore";

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
        <div className="rounded-[24px] border border-[#d9d5cf] bg-white px-6 py-10 text-center shadow-[0_14px_36px_rgba(33,37,41,0.05)]">
          <p className="text-base font-semibold text-slate-900">
            No hay productos en el carrito.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Añade artículos antes de pagar.
          </p>
          <Link
            to={backHref}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-emerald-700 px-7 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            {store ? "Volver a la tienda" : "Volver al catálogo"}
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
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-[2.6rem]">
          Finalizar compra
        </h1>
        <p className="mt-1.5 text-[0.95rem] text-slate-500">
          Revisa tu pedido y confirma el pago protegido.
        </p>
      </div>

      <form onSubmit={submit}>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-10">
          <div className="order-2 min-w-0 lg:order-1 lg:flex-[7]">
            <div className="space-y-6">
              {hasProducts ? (
              <section className="rounded-[14px] border border-[#e8e1da] bg-white p-6 shadow-[0_12px_32px_rgba(33,37,41,0.05)] sm:p-8">
                <div className="flex items-center gap-3">
                  <CheckoutSectionBadge n={1} />
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
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
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                          : "border-[#e2dcd4] bg-white text-slate-600 hover:bg-stone-50"
                      }`}
                    >
                      {m === "shipping" ? "Envío a domicilio" : "Recoger"}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  {deliveryComplete ? (
                    <div className="rounded-[10px] border border-[#e8e1da] bg-[#fafaf9] px-4 py-4">
                      <p className="text-sm font-bold text-slate-900">
                        {delivery.fullName.trim()}
                      </p>
                      {needsAddress && deliveryAddressLine ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {deliveryAddressLine}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-slate-600">
                        {delivery.phone.trim()}
                      </p>
                      {delivery.phone2.trim() ? (
                        <p className="mt-0.5 text-sm text-slate-500">
                          {delivery.phone2.trim()}
                        </p>
                      ) : null}
                      {needsAddress && pinReady ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Pin: {delivery.latitude?.toFixed(5)},{" "}
                          {delivery.longitude?.toFixed(5)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-slate-600">
                      {needsAddress
                        ? "Completa nombre, dirección, teléfonos y ubicación en el mapa para calcular el envío."
                        : "Completa nombre y teléfono para coordinar la recogida."}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={openDeliveryModal}
                    className="mt-4 w-full rounded-[10px] border border-emerald-200 bg-emerald-50/60 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
                  >
                    {deliveryComplete
                      ? "Editar datos de entrega"
                      : "Completar datos de entrega"}
                  </button>
                </div>
              </section>
              ) : (
              <section className="rounded-[14px] border border-[#e8e1da] bg-white p-6 shadow-[0_12px_32px_rgba(33,37,41,0.05)] sm:p-8">
                <div className="flex items-center gap-3">
                  <CheckoutSectionBadge n={1} />
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                    Datos de contacto
                  </h2>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  Los servicios no requieren dirección de entrega. Indica nombre y
                  teléfono para el comprobante.
                </p>
                <div className="mt-6">
                  {deliveryComplete ? (
                    <div className="rounded-[10px] border border-[#e8e1da] bg-[#fafaf9] px-4 py-4">
                      <p className="text-sm font-bold text-slate-900">
                        {delivery.fullName.trim()}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {delivery.phone.trim()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Completa nombre y teléfono de contacto.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={openDeliveryModal}
                    className="mt-4 w-full rounded-[10px] border border-emerald-200 bg-emerald-50/60 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
                  >
                    {deliveryComplete
                      ? "Editar datos de contacto"
                      : "Completar datos de contacto"}
                  </button>
                </div>
              </section>
              )}

              <section className="rounded-[14px] border border-[#e8e1da] bg-white p-6 shadow-[0_12px_32px_rgba(33,37,41,0.05)] sm:p-8">
                <div className="flex items-center gap-3">
                  <CheckoutSectionBadge n={hasProducts ? 2 : 1} />
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                    Método de Pago
                  </h2>
                </div>

                {previewLoading ? (
                  <p className="mt-6 text-sm text-slate-500">
                    Calculando total con envío…
                  </p>
                ) : null}

                {previewError ? (
                  <p className="mt-6 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {previewError}
                  </p>
                ) : null}

                <div className="mt-6 flex items-start gap-3 rounded-[10px] border border-emerald-200 bg-emerald-50/60 px-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900">
                      Pago protegido
                    </p>
                    <p className="mt-1 text-sm leading-snug text-slate-600">
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
                <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
                  Al confirmar aceptas nuestros términos de servicio y política
                  de privacidad.
                </p>
              </div>
            </div>
          </div>

          <aside className="order-1 flex min-w-0 flex-col gap-4 lg:order-2 lg:flex-[3] lg:sticky lg:top-28">
            <div className="rounded-[14px] border border-[#e3ddd6] bg-white p-5 shadow-[0_12px_30px_rgba(33,37,41,0.06)]">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
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
                        className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100"
                      >
                        {line.photoUrl ? (
                          <ProtectedMediaImg
                            src={line.photoUrl}
                            alt={line.name}
                            wrapperClassName="h-full w-full"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">
                            —
                          </span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={href}
                          className="line-clamp-2 text-sm font-bold text-slate-900 transition hover:text-emerald-700"
                        >
                          {line.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {line.kind === "service" ? "Servicio" : "Producto"} ·
                          Cant. {line.quantity}
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-emerald-700">
                          {priceTag(line.unitPrice * line.quantity, line.currencyCode)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 space-y-2 border-t border-[#efe9e3] pt-5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {priceTag(preview?.subtotal ?? subtotal, summaryCurrency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Envío</span>
                  {preview ? (
                    <span className="font-extrabold text-emerald-700">
                      {priceTag(preview.deliveryFee, preview.currencyCode)}
                    </span>
                  ) : (
                    <span className="max-w-[11rem] text-right text-sm font-medium text-slate-500">
                      {needsAddress
                        ? "Se calcula según tu ubicación"
                        : "Sin costo (recogida)"}
                    </span>
                  )}
                </div>
                {preview?.routeDistanceKm != null ? (
                  <div className="flex justify-between text-slate-600">
                    <span>Distancia</span>
                    <span className="font-semibold text-slate-800">
                      {preview.routeDistanceKm.toFixed(1)} km
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex items-end justify-between border-t border-[#efe9e3] pt-5">
                <span className="text-base font-extrabold text-slate-900">
                  Total
                </span>
                <span className="text-right text-xl font-extrabold text-emerald-800">
                  {priceTag(preview?.total ?? subtotal, summaryCurrency)}
                </span>
              </div>

              <div className="hidden lg:block">
                <CheckoutPayButton
                  isCreating={isCreating}
                  previewLoading={previewLoading}
                  className="mt-6"
                />
                <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
                  Al confirmar aceptas nuestros términos de servicio y política
                  de privacidad.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-10 flex gap-3 rounded-[14px] border border-[#e3ddd6] bg-[#f5f2ee] px-4 py-4 text-sm text-slate-600">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Truck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-extrabold text-slate-900">Logística segura</p>
            <p className="mt-1 leading-snug text-slate-600">
              Seguimiento del envío y entrega coordinada. Te avisaremos en cada
              etapa.
            </p>
          </div>
        </div>
      </form>
    </div>,
  );
}
