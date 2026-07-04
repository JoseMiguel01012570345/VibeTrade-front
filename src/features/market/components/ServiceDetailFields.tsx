import { useState } from "react";
import {
  type StoreService,
} from "@features/market/logic/storeCatalogTypes";
import {
  ProtectedMediaAnchor,
  ProtectedMediaImg,
} from "@shared/components/media/ProtectedMediaImg";
import { ImageLightbox } from "@shared/components/media/ImageLightbox";

/** Bloque etiqueta + contenido con el ritmo tipográfico del detalle (storefront). */
function Field({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <dt className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {children}
      </dd>
    </div>
  );
}

/**
 * Campos detallados de un servicio (Qué incluye, Qué no incluye, riesgos,
 * dependencias, entregables, garantías, propiedad intelectual y campos libres con
 * adjuntos). Antes vivían en la tarjeta verbosa `ServiceDetailCard`; ahora se
 * muestran solo en la página de detalle del servicio, con la paleta del storefront.
 */
export function ServiceDetailFields({ s }: Readonly<{ s: StoreService }>) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="rounded-[16px] border border-[#e5ddd5] bg-white p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
        Detalles del servicio
      </h2>

      <dl className="mt-5 space-y-4">
        {s.riesgos.enabled && s.riesgos.items.length > 0 ? (
          <Field label="Riesgos">
            <ul className="m-0 list-disc pl-4">
              {s.riesgos.items.map((x, i) => (
                <li key={`${x}-${i}`}>{x}</li>
              ))}
            </ul>
          </Field>
        ) : null}

        <Field label="Qué incluye">{s.incluye}</Field>
        <Field label="Qué no incluye">{s.noIncluye}</Field>

        {s.dependencias.enabled && s.dependencias.items.length > 0 ? (
          <Field label="Dependencias">
            <ul className="m-0 list-disc pl-4">
              {s.dependencias.items.map((x, i) => (
                <li key={`${x}-${i}`}>{x}</li>
              ))}
            </ul>
          </Field>
        ) : null}

        <Field label="Qué se entrega">{s.entregables}</Field>

        {s.garantias.enabled ? (
          <Field label="Garantías">{s.garantias.texto}</Field>
        ) : null}

        <Field label="Propiedad intelectual">{s.propIntelectual}</Field>

        {s.customFields.length > 0 ? (
          <div className="border-t border-[#e5ddd5] pt-4">
            <dt className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
              Información adicional
            </dt>
            {s.customFields.map((f, i) => (
              <dd key={`${f.title}-${i}`} className="mb-4 last:mb-0">
                <span className="text-sm font-bold text-slate-700">
                  {f.title}
                </span>
                {f.body ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {f.body}
                  </p>
                ) : null}
                {f.attachmentNote ? (
                  <p className="mt-1 text-[12px] text-slate-400">
                    {f.attachmentNote}
                  </p>
                ) : null}
                {f.attachments && f.attachments.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {f.attachments.map((att) =>
                      att.kind === "image" ? (
                        <div
                          key={att.id}
                          className="relative block max-w-[160px]"
                        >
                          <ProtectedMediaImg
                            src={att.url}
                            alt={att.fileName}
                            wrapperClassName="block max-w-[160px]"
                            className="max-h-32 max-w-[160px] rounded border border-[#e5ddd5] object-contain"
                          />
                          <button
                            type="button"
                            className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
                            aria-label={`Ver ${att.fileName} ampliada`}
                            title="Ver imagen ampliada"
                            onClick={() => setLightboxUrl(att.url)}
                          />
                        </div>
                      ) : (
                        <ProtectedMediaAnchor
                          key={att.id}
                          href={att.url}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#e5ddd5] bg-stone-50 px-2 py-1 text-[12px] font-semibold text-emerald-700"
                        >
                          {att.fileName}
                        </ProtectedMediaAnchor>
                      ),
                    )}
                  </div>
                ) : null}
              </dd>
            ))}
          </div>
        ) : null}
      </dl>

      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
