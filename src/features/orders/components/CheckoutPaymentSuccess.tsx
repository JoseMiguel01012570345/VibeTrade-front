import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { toast } from "sonner";
import { downloadOrderReceiptPdf } from "../logic/orderReceiptPdf";

export function CheckoutPaymentSuccess({
  publicNumber,
  continueShoppingHref = "/search",
}: {
  publicNumber: string;
  continueShoppingHref?: string;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(publicNumber);
      toast.success("Número de pedido copiado al portapapeles.");
    } catch {
      toast.error(
        "No se pudo copiar. Selecciona el código y cópialo manualmente.",
      );
    }
  }

  async function downloadReceipt() {
    setPdfLoading(true);
    try {
      await downloadOrderReceiptPdf(publicNumber);
      toast.success("Comprobante descargado.");
    } catch {
      toast.error("No se pudo descargar el comprobante. Inténtalo más tarde.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_14px_40px_rgba(33,37,41,0.07)]">
        <div className="flex flex-col items-center space-y-8 px-6 pb-8 pt-10 text-center sm:px-8">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface))] text-[var(--primary)]">
            <CheckCircle2 className="h-10 w-10" strokeWidth={2.25} aria-hidden />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-[1.65rem]">
              ¡Pago Realizado con Éxito!
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              Tu pedido ha sido procesado correctamente.
            </p>
          </div>

          <div className="w-full rounded-2xl border-2 border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] px-5 py-5 text-center shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              Número de pedido
            </p>
            <p className="mx-auto mt-2 max-w-[26rem] text-xs leading-snug text-[var(--muted)]">
              Identificador oficial de tu compra. Guárdalo y compártelo con quien
              recibirá el pedido.
            </p>
            <p className="mt-4 break-all font-mono text-xl font-extrabold tracking-tight text-[var(--primary)] sm:text-2xl">
              {publicNumber}
            </p>
          </div>

          <div className="flex w-full gap-3 rounded-xl border-2 border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-[var(--surface)] px-4 py-4 text-left shadow-sm">
            <Info
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]"
              aria-hidden
            />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--text)]">
                Quien reciba el pedido lo necesitará
              </p>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                Comparte este mismo código: lo pedirán para confirmar la entrega y
                asegurarse de que el pedido llega completo y seguro.
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void copyNumber()}
              className="vt-storefront-accent-btn inline-flex h-12 items-center justify-center rounded-xl px-5 text-sm font-bold text-white shadow-md transition"
            >
              Copiar
            </button>
            <button
              type="button"
              disabled={pdfLoading}
              onClick={() => void downloadReceipt()}
              className="vt-storefront-accent-btn-outline inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 px-5 text-sm font-bold transition disabled:opacity-60"
            >
              {pdfLoading ? <CeSpinner size="sm" /> : null}
              <span>{pdfLoading ? "Generando…" : "Descargar comprobante"}</span>
            </button>
          </div>

          <p className="mt-2 text-sm text-[var(--muted)]">
            <Link
              to="/rastreo"
              className="font-bold text-[var(--primary)] underline underline-offset-4 hover:text-[var(--primary-2)]"
            >
              Rastrea tu envío
            </Link>
            {" · "}
            <Link
              to={continueShoppingHref}
              className="font-semibold text-[var(--muted)] underline underline-offset-4 hover:text-[var(--text)]"
            >
              Seguir comprando
            </Link>
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 rounded-none border-t border-[color-mix(in_oklab,var(--primary)_22%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] sm:text-[11px]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
          Pago seguro por VibeTrade
        </div>
      </article>
    </div>
  );
}
