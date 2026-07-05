import { Headphones, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Truck,
    title: "Logística 24h segura",
    body: "Rutas optimizadas para un tiempo de tránsito mínimo.",
  },
  {
    icon: ShieldCheck,
    title: "Manejo seguro",
    body: "Cada paquete se maneja con cuidado profesional.",
  },
  {
    icon: Headphones,
    title: "Soporte 24/7",
    body: "Nuestro equipo está disponible para ayudarte.",
  },
];

/** Fila informativa (3 tarjetas) mostrada bajo el buscador de rastreo. */
export function TrackShipmentFeatures() {
  return (
    <div className="hidden gap-4 sm:grid sm:grid-cols-3">
      {FEATURES.map(({ icon: Icon, title, body }) => (
        <div
          key={title}
          className="rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-4 py-5 text-center sm:text-left"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--primary)_14%,var(--surface))] text-[var(--primary)] sm:mx-0">
            <Icon className="h-8 w-8" aria-hidden />
          </div>
          <h2 className="text-base font-extrabold text-[var(--text)]">{title}</h2>
          <p className="mt-2 text-sm leading-snug text-[var(--muted)]">{body}</p>
        </div>
      ))}
    </div>
  );
}
