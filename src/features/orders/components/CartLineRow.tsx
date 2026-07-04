import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { priceTag } from "../logic/formatMoney";
import type { DetailedLine } from "../logic/useCartController";
import { cartLineKey } from "../logic/cartStore";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { storeProductHref } from "@features/market/logic/store/storePath";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";

/** Fila de un artículo del carrito (imagen, nombre, presentación, precio, cantidad y quitar). */
export function CartLineRow({
  line,
  isLast,
  store,
  onSetQuantity,
  onRemove,
}: Readonly<{
  line: DetailedLine;
  isLast: boolean;
  store: Pick<StoreBadge, "id" | "name"> | null | undefined;
  onSetQuantity: (lineKey: string, quantity: number) => void;
  onRemove: (lineKey: string) => void;
}>) {
  const lineKey = cartLineKey(line);
  const offerHref =
    line.kind === "product" && line.productId
      ? storeProductHref(store, line.productId)
      : line.kind === "service" && line.serviceId
        ? storeProductHref(store, line.serviceId)
        : "#";
  const photo =
    line.photoUrl ||
    line.product?.photoUrls[0] ||
    line.service?.photoUrls?.[0] ||
    "";
  const measure =
    line.kind === "service"
      ? "Servicio"
      : line.product?.model?.trim() || "Presentación estándar";
  return (
    <div
      className={`flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
        isLast ? "" : "border-b border-[#f0ebe5]"
      }`}
    >
      <div className="flex items-center gap-4">
        <Link
          to={offerHref}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-stone-100"
        >
          {photo ? (
            <ProtectedMediaImg
              src={photo}
              alt={line.name}
              wrapperClassName="h-full w-full"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-semibold text-slate-400">
              Sin foto
            </span>
          )}
        </Link>

        <div className="min-w-0">
          <Link
            to={offerHref}
            className="block truncate text-[0.98rem] font-bold text-slate-900 transition hover:text-emerald-700"
          >
            {line.name}
          </Link>
          <p className="mt-0.5 text-[0.82rem] text-slate-500">
            {measure}
            {line.currencyCode ? ` · ${line.currencyCode}` : ""}
          </p>
          <p className="mt-1 text-[0.92rem] font-bold text-emerald-700">
            {priceTag(line.unitPrice, line.currencyCode)}
          </p>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-nowrap sm:justify-end">
        <div className="inline-flex items-center gap-4 rounded-full border border-[#ddd5ce] bg-white px-3 py-1.5 text-[0.95rem] font-semibold text-slate-600">
          <button
            type="button"
            onClick={() =>
              onSetQuantity(lineKey, Math.max(1, line.quantity - 1))
            }
            className="transition hover:text-emerald-700"
            aria-label={`Reducir cantidad de ${line.name}`}
          >
            −
          </button>
          <span className="min-w-5 text-center tabular-nums">
            {line.quantity}
          </span>
          <button
            type="button"
            onClick={() => onSetQuantity(lineKey, line.quantity + 1)}
            className="transition hover:text-emerald-700"
            aria-label={`Aumentar cantidad de ${line.name}`}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => onRemove(lineKey)}
          className="text-[#d9532b] transition hover:text-[#bf4420]"
          aria-label={`Quitar ${line.name}`}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
