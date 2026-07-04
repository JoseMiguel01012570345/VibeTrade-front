import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { LifeBuoy, X } from "lucide-react";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";

const fieldLabel = "mb-1.5 block text-sm font-semibold text-slate-800";
const fieldBase =
  "w-full rounded-xl border border-[#e3ddd6] bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-emerald-600/30 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2";

/**
 * Modal «Escribir a soporte» de la tienda. Réplica de la UI/UX del soporte de la
 * app de referencia (frontend-guest, `GuestSupportFab`): mensaje + teléfono de
 * contacto + número de pedido opcional. VibeTrade no tiene aún un endpoint de
 * soporte, así que el envío se confirma localmente (mismo criterio pragmático que
 * el resto de la superficie de tienda).
 */
export function StorefrontSupportModal({
  open,
  store,
  onClose,
}: Readonly<{
  open: boolean;
  store: StoreBadge;
  onClose: () => void;
}>) {
  const [motive, setMotive] = useState("");
  const [replyPhone, setReplyPhone] = useState("");
  const [publicNumber, setPublicNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  function handleSubmit() {
    const trimmedMotive = motive.trim();
    if (!trimmedMotive) {
      toast.error("Indica el motivo del mensaje.");
      return;
    }
    if (replyPhone.trim().length < 6) {
      toast.error("Indica un teléfono de contacto válido.");
      return;
    }

    setSubmitting(true);
    // Envío simulado (sin backend de soporte): confirmamos la recepción localmente.
    setTimeout(() => {
      toast.success("Mensaje enviado. El equipo de la tienda te contactará.");
      setMotive("");
      setReplyPhone("");
      setPublicNumber("");
      setSubmitting(false);
      onClose();
    }, 350);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        aria-label="Cerrar"
        disabled={submitting}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="storefront-support-title"
        className="relative grid max-h-[calc(100dvh-1.5rem)] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[20px] border border-[#e8e1da] bg-white text-slate-900 shadow-[0_24px_60px_rgba(33,37,41,0.18)] sm:max-h-[min(90dvh,560px)]"
      >
        <div className="relative shrink-0 px-6 pb-3 pt-5 sm:pt-6">
          <div className="mb-3 flex justify-center sm:hidden" aria-hidden>
            <div className="h-1 w-10 rounded-full bg-slate-300" />
          </div>
          <div className="flex items-start gap-3 pr-8">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <LifeBuoy size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2
                id="storefront-support-title"
                className="text-xl font-extrabold tracking-tight text-slate-900"
              >
                Escribir a soporte
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Cuéntanos tu consulta sobre {store.name}. Indica un teléfono de
                contacto; el número de pedido es opcional.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Cerrar"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-y-contain px-6">
          <div className="space-y-3.5 pb-3">
            <div>
              <label htmlFor="storefront-support-motive" className={fieldLabel}>
                Mensaje
              </label>
              <textarea
                id="storefront-support-motive"
                rows={3}
                value={motive}
                onChange={(e) => setMotive(e.target.value)}
                placeholder="Describe tu consulta o incidencia…"
                className={`${fieldBase} resize-none`}
              />
            </div>
            <div>
              <label htmlFor="storefront-support-phone" className={fieldLabel}>
                Teléfono de contacto
              </label>
              <input
                id="storefront-support-phone"
                type="tel"
                autoComplete="tel"
                value={replyPhone}
                onChange={(e) => setReplyPhone(e.target.value)}
                placeholder="ej. +53 5 1234567"
                className={fieldBase}
              />
            </div>
            <div>
              <label htmlFor="storefront-support-order" className={fieldLabel}>
                Número de pedido (opcional)
              </label>
              <input
                id="storefront-support-order"
                type="text"
                autoComplete="off"
                value={publicNumber}
                onChange={(e) => setPublicNumber(e.target.value)}
                placeholder="ej. VT-12345678"
                className={fieldBase}
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-[#ece4dc] bg-[#fafaf9] px-6 py-3.5">
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? "Enviando…" : "Enviar mensaje"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
