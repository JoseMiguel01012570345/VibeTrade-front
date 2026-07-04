import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, HelpCircle } from "lucide-react";

/** Estado de error del rastreo: el número no coincide con ningún pedido. */
export function TrackShipmentError({
  onRetry,
}: Readonly<{ onRetry: () => void }>) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-start">
      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          Error de rastreo
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[1.75rem]">
          No pudimos encontrar tu pedido
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          El número introducido no coincide con ningún pedido en nuestro sistema.
          Comprueba que no haya errores de escritura o espera unos minutos si
          acabas de completar la compra: a veces los datos tardan un poco en
          sincronizarse.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-800"
          >
            Intentar de nuevo
          </button>
          <Link
            to="/mis-compras"
            className="rounded-xl border border-emerald-200 bg-white px-6 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            Ver mis compras
          </Link>
        </div>
      </div>

      <aside className="hidden rounded-[16px] border border-sky-100 bg-sky-50/90 p-5 shadow-[0_8px_24px_rgba(14,116,144,0.08)] lg:block">
        <h3 className="text-base font-extrabold text-slate-900">
          ¿Qué puedes hacer?
        </h3>
        <ul className="mt-5 space-y-4 text-sm leading-snug text-slate-700">
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <span>
              Revisa el código en el correo o pantalla de confirmación y cópialo
              tal cual aparece.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm">
              <Clock className="h-5 w-5" aria-hidden />
            </span>
            <span>
              Si pagaste hace poco, espera al menos un par de horas por si el
              pedido aún se está registrando.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm">
              <HelpCircle className="h-5 w-5" aria-hidden />
            </span>
            <span>
              Si el problema persiste, contacta al equipo de soporte de la tienda
              desde su página.
            </span>
          </li>
        </ul>
      </aside>
    </div>
  );
}
