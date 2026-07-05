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
      <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_14px_40px_rgba(33,37,41,0.07)]">
        <div className="flex flex-col items-center space-y-8 px-6 pb-8 pt-10 text-center sm:px-8">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-10 w-10" strokeWidth={2.25} aria-hidden />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[1.65rem]">
              ¡Pago Realizado con Éxito!
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-600 sm:text-base">
              Tu pedido ha sido procesado correctamente.
            </p>
          </div>

          <div className="w-full rounded-2xl border-2 border-[#c5d4f7] bg-[#EBF0FF] px-5 py-5 text-center shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Número de pedido
            </p>
            <p className="mx-auto mt-2 max-w-[26rem] text-xs leading-snug text-slate-600">
              Identificador oficial de tu compra. Guárdalo y compártelo con quien
              recibirá el pedido.
            </p>
            <p className="mt-4 break-all font-mono text-xl font-extrabold tracking-tight text-emerald-800 sm:text-2xl">
              {publicNumber}
            </p>
          </div>

          <div className="flex w-full gap-3 rounded-xl border-2 border-emerald-200/90 bg-white px-4 py-4 text-left shadow-sm">
            <Info
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800"
              aria-hidden
            />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">
                Quien reciba el pedido lo necesitará
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                Comparte este mismo código: lo pedirán para confirmar la entrega y
                asegurarse de que el pedido llega completo y seguro.
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void copyNumber()}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-transparent bg-emerald-700 px-5 text-sm font-bold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800"
            >
              Copiar
            </button>
            <button
              type="button"
              disabled={pdfLoading}
              onClick={() => void downloadReceipt()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-700 bg-white px-5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
            >
              {pdfLoading ? <CeSpinner size="sm" /> : null}
              <span>{pdfLoading ? "Generando…" : "Descargar comprobante"}</span>
            </button>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            <Link
              to="/rastreo"
              className="font-bold text-emerald-800 underline underline-offset-4 hover:text-emerald-900"
            >
              Rastrea tu envío
            </Link>
            {" · "}
            <Link
              to={continueShoppingHref}
              className="font-semibold text-slate-600 underline underline-offset-4 hover:text-slate-900"
            >
              Seguir comprando
            </Link>
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 rounded-none border-t border-[#dfe8ff] bg-[#EBF0FF] px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:text-[11px]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          Pago seguro por VibeTrade
        </div>
      </article>
    </div>
  );
}
