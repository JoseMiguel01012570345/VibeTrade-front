import { Wrench } from "lucide-react";
import {
  catalogMonedasList,
  type StoreService,
} from "../chat/domain/storeCatalogTypes";
import {
  ProtectedMediaAnchor,
  ProtectedMediaImg,
} from "../../components/media/ProtectedMediaImg";

export function ServiceDetailCard({ s }: { s: StoreService }) {
  const monedas = catalogMonedasList(s);
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div className="flex items-start gap-2">
        <Wrench
          size={20}
          className="mt-0.5 shrink-0 text-[var(--muted)]"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            {s.category}
          </div>
          <div className="mt-1 font-black tracking-[-0.02em]">
            {s.tipoServicio}
          </div>
          {monedas.length > 0 ? (
            <div className="mt-1.5 text-[12px] font-bold text-[var(--muted)]">
              Monedas aceptadas: {monedas.join(" · ")}
            </div>
          ) : null}
          <p className="vt-muted mt-2 text-[13px] leading-snug">
            {s.descripcion}
          </p>
          <dl className="mt-3 space-y-2 text-[13px] leading-snug">
            {s.riesgos.enabled && s.riesgos.items.length > 0 ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Riesgos
                </dt>
                <dd>
                  <ul className="m-0 list-disc pl-4">
                    {s.riesgos.items.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Qué incluye
              </dt>
              <dd className="whitespace-pre-wrap">{s.incluye}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Qué no incluye
              </dt>
              <dd className="whitespace-pre-wrap">{s.noIncluye}</dd>
            </div>
            {s.dependencias.enabled && s.dependencias.items.length > 0 ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Dependencias
                </dt>
                <dd>
                  <ul className="m-0 list-disc pl-4">
                    {s.dependencias.items.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Qué se entrega
              </dt>
              <dd className="whitespace-pre-wrap">{s.entregables}</dd>
            </div>
            {s.garantias.enabled ? (
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Garantías
                </dt>
                <dd className="whitespace-pre-wrap">{s.garantias.texto}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Propiedad intelectual
              </dt>
              <dd className="whitespace-pre-wrap">{s.propIntelectual}</dd>
            </div>
            {s.customFields.length > 0 ? (
              <div className="border-t border-[var(--border)] pt-2">
                <dt className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Información adicional
                </dt>
                {s.customFields.map((f, i) => (
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
                            <ProtectedMediaAnchor
                              key={att.id}
                              href={att.url}
                              className="block"
                            >
                              <ProtectedMediaImg
                                src={att.url}
                                alt={att.fileName}
                                wrapperClassName="block max-w-[160px]"
                                className="max-h-32 max-w-[160px] rounded border border-[var(--border)] object-contain"
                              />
                            </ProtectedMediaAnchor>
                          ) : (
                            <ProtectedMediaAnchor
                              key={att.id}
                              href={att.url}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,var(--surface))] px-2 py-1 text-[12px] font-semibold text-[var(--primary)]"
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
    </div>
  );
}
