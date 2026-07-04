import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useCartController } from "../logic/useCartController";
import { CartLineRow } from "../components/CartLineRow";
import { CartOrderSummaryCard } from "../components/CartOrderSummaryCard";
import { CartEmptyState, CartImporting } from "../components/CartStates";
import { StorefrontChrome, StorefrontProductCard } from "@features/storefront";

export function CartPage() {
  const {
    store,
    storeForLinks,
    keepShoppingHref,
    importingShare,
    isEmpty,
    detailedLines,
    suggestions,
    subtotal,
    currency,
    totalUnits,
    sharingCart,
    shareDisabled,
    setQuantity,
    removeItem,
    onCheckout,
    onShare,
  } = useCartController();

  let body: ReactNode;
  if (importingShare) {
    body = <CartImporting />;
  } else if (isEmpty) {
    body = <CartEmptyState homeHref={keepShoppingHref} />;
  } else {
    body = (
      <div className="mx-auto w-full max-w-[1140px] px-4 py-6 sm:py-10">
        <Link
          to={keepShoppingHref}
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 lg:hidden"
        >
          <span aria-hidden>←</span>
          <span>Seguir comprando</span>
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-[3.1rem]">
            Tu Carrito de Compras
          </h1>
          <p className="mt-1.5 text-[0.95rem] text-slate-500">
            Revisa tus artículos y procede al pago seguro.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 lg:flex-[6]">
            <div className="overflow-hidden rounded-[12px] border border-[#e3ddd6] bg-white shadow-[0_10px_26px_rgba(33,37,41,0.04)]">
              {detailedLines.map((line, index) => (
                <CartLineRow
                  key={line.productId}
                  line={line}
                  isLast={index === detailedLines.length - 1}
                  store={storeForLinks}
                  onSetQuantity={setQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>

            <Link
              to={keepShoppingHref}
              className="mt-8 hidden items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 lg:inline-flex"
            >
              <span aria-hidden>←</span>
              <span>Seguir comprando</span>
            </Link>
          </div>

          <CartOrderSummaryCard
            units={totalUnits}
            subtotal={subtotal}
            currency={currency}
            onCheckout={onCheckout}
            onShare={onShare}
            sharing={sharingCart}
            shareDisabled={shareDisabled}
          />
        </div>

        {suggestions.length > 0 ? (
          <section className="pt-16 sm:pt-24">
            <h2 className="mb-6 text-[1.05rem] font-extrabold tracking-tight text-slate-900">
              Más productos de esta tienda
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {suggestions.map((product) => (
                <StorefrontProductCard key={product.id} p={product} compact />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  if (store) {
    return <StorefrontChrome store={store}>{body}</StorefrontChrome>;
  }

  return (
    <div className="store-front-surface min-h-full bg-[#f7f3ef] pb-[96px] text-slate-900 sm:pb-[112px]">
      {body}
    </div>
  );
}
