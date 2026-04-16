import { useState } from "react";
import { Package } from "lucide-react";
import {
  catalogMonedasList,
  type StoreProduct,
} from "../chat/domain/storeCatalogTypes";
import {
  ProtectedMediaAnchor,
  ProtectedMediaImg,
} from "../../components/media/ProtectedMediaImg";
import { ImageLightbox } from "../chat/components/media/ImageLightbox";

export function ProductDetailCard({ p }: { p: StoreProduct }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const monedasAceptadas = catalogMonedasList(p);
  const precioMoneda = p.monedaPrecio?.trim();
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="grid min-[640px]:grid-cols-[160px_1fr]">
        <div className="relative min-h-[120px] bg-[color-mix(in_oklab,var(--bg)_75%,var(--surface))]">
          {p.photoUrls[0] ? (
            <>
              <ProtectedMediaImg
                src={p.photoUrls[0]}
                alt={p.name}
                wrapperClassName="absolute inset-0 h-full w-full"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <button
                type="button"
                className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
                aria-label="Ver foto ampliada"
                title="Ver foto ampliada"
                onClick={() => setLightboxUrl(p.photoUrls[0])}
              />
            </>
          ) : (
            <div className="grid h-full min-h-[120px] place-items-center text-[var(--muted)]">
              <Package size={28} aria-hidden />
            </div>
          )}
        </div>
        <div className="p-3.5">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            {p.category}
          </div>
          <div className="mt-1 text-base font-black tracking-[-0.02em]">
            {p.name}
            {p.model ? (
              <span className="font-bold text-[var(--muted)]">
                {" "}
                · {p.model}
              </span>
            ) : null}
          </div>
          <div className="mt-2 text-sm font-bold text-[color-mix(in_oklab,var(--primary)_90%,var(--text))]">
            {p.price}
            {precioMoneda ? (
              <span className="ml-1.5 font-semibold text-[var(--muted)]">
                · {precioMoneda}
              </span>
            ) : null}
          </div>
          {monedasAceptadas.length > 0 &&
          !(
            precioMoneda &&
            monedasAceptadas.length === 1 &&
            monedasAceptadas[0] === precioMoneda
          ) ? (
            <div className="mt-1 text-[11px] font-semibold leading-snug text-[var(--muted)]">
              Moneda aceptada: {monedasAceptadas.join(" · ")}
            </div>
          ) : null}
          {p.photoUrls.length > 1 ? (
            <div className="mt-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Más fotos
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {p.photoUrls.slice(1).map((url, i) => (
                  <div
                    key={i}
                    className="relative block overflow-hidden rounded-lg border border-[var(--border)]"
                  >
                    <ProtectedMediaImg
                      src={url}
                      alt=""
                      wrapperClassName="block h-16 w-16 sm:h-20 sm:w-20"
                      className="h-16 w-16 object-cover sm:h-20 sm:w-20"
                    />
                    <button
                      type="button"
                      className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
                      aria-label="Ver foto ampliada"
                      title="Ver foto ampliada"
                      onClick={() => setLightboxUrl(url)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <dl className="mt-3 space-y-2 text-[13px] leading-snug">
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Descripción breve
              </dt>
              <dd>{p.shortDescription}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Beneficio principal
              </dt>
              <dd>{p.mainBenefit}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Características técnicas
              </dt>
              <dd className="whitespace-pre-wrap">{p.technicalSpecs}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Estado
              </dt>
              <dd className="capitalize">{p.condition}</dd>
            </div>
            {p.taxesShippingInstall ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Impuestos / envío / instalación
                </dt>
                <dd>{p.taxesShippingInstall}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Disponibilidad
              </dt>
              <dd>{p.availability}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Garantía y devolución
              </dt>
              <dd className="whitespace-pre-wrap">{p.warrantyReturn}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Contenido incluido
              </dt>
              <dd className="whitespace-pre-wrap">{p.contentIncluded}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Condiciones de uso
              </dt>
              <dd className="whitespace-pre-wrap">{p.usageConditions}</dd>
            </div>
            {p.customFields.length > 0 ? (
              <div className="border-t border-[var(--border)] pt-2">
                <dt className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Otros campos
                </dt>
                {p.customFields.map((f, i) => (
                  <dd key={i} className="mb-3 last:mb-0">
                    <span className="font-bold">{f.title}</span>
                    {f.body ? (
                      <p className="mt-0.5 whitespace-pre-wrap leading-snug">
                        {f.body}
                      </p>
                    ) : null}
                    {f.attachmentNote ? (
                      <p className="vt-muted mt-0.5 text-[12px]">
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
                                className="max-h-32 max-w-[160px] rounded border border-[var(--border)] object-contain"
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
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[12px] font-semibold text-[var(--primary)]"
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
        </div>
      </div>

      <ImageLightbox
        url={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />
    </div>
  );
}
