import { useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  ProtectedMediaAnchor,
  ProtectedMediaImg,
} from "../../../../components/media/ProtectedMediaImg";
import { VtSelect, type VtSelectOption } from "../../../../components/VtSelect";
import {
  isProtectedMediaUrl,
  mediaApiUrl,
  releaseMediaObjectUrl,
  uploadMedia,
} from "../../../../utils/media/mediaClient";
import { cn } from "../../../../lib/cn";
import { ModalFormField as Field } from "./ModalFormField";
import {
  emptyTradeAgreementExtraField,
  type TradeAgreementExtraFieldDraft,
  type TradeAgreementExtraFieldScope,
} from "../../domain/tradeAgreementTypes";
import { fieldLabel, fieldRoot } from "../../styles/formModalStyles";

const VALUE_KIND_OPTIONS: VtSelectOption[] = [
  { value: "text", label: "Texto" },
  { value: "image", label: "Foto / imagen" },
  { value: "document", label: "Documento" },
];

type Props = {
  fields: TradeAgreementExtraFieldDraft[];
  errors?: Record<number, string>;
  onChange: (next: TradeAgreementExtraFieldDraft[]) => void;
  /** Scope asignado a las filas nuevas (bloque mercancía, servicio o legado combinado). */
  newRowScope?: TradeAgreementExtraFieldScope;
};

export function AgreementExtraFieldsEditor({
  fields,
  errors,
  onChange,
  newRowScope = "merchandise",
}: Props) {
  const [uploadingRowKey, setUploadingRowKey] = useState<string | null>(null);

  function patch(i: number, patch_: Partial<TradeAgreementExtraFieldDraft>) {
    onChange(fields.map((f, j) => (j === i ? { ...f, ...patch_ } : f)));
  }

  function clearMedia(i: number) {
    const row = fields[i];
    if (row?.mediaUrl && isProtectedMediaUrl(row.mediaUrl)) {
      releaseMediaObjectUrl(row.mediaUrl);
    }
    patch(i, { mediaUrl: "", fileName: "" });
  }

  async function handleFile(i: number, file: File, kind: "image" | "document") {
    const row = fields[i];
    if (!row) return;
    try {
      setUploadingRowKey(row.id);
      const up = await uploadMedia(file);
      const url = mediaApiUrl(up.id);
      if (row.mediaUrl && isProtectedMediaUrl(row.mediaUrl)) {
        releaseMediaObjectUrl(row.mediaUrl);
      }
      patch(i, {
        valueKind: kind,
        mediaUrl: url,
        fileName: file.name || up.fileName,
        textValue: "",
      });
    } catch {
      toast.error(
        "No se pudo subir el archivo. Reintenta con otro tamaño o formato.",
      );
    } finally {
      setUploadingRowKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="vt-muted mb-1 text-[13px]">
        Titulá cada punto y definí si el contenido es texto libre o un archivo que
        subís (foto o documento). Puedes sumar todas las filas que necesiten las
        partes.
      </p>
      {fields.map((row, i) => {
        const fileInputId = `agr-xf-file-${row.id}`;
        const busy = uploadingRowKey === row.id;
        const hasMedia = !!(row.mediaUrl ?? "").trim();

        return (
          <div
            key={row.id}
            className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,transparent)] p-3"
          >
            <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
              Campo adicional {i + 1}
            </div>
            <Field
              label="Título"
              value={row.title}
              onChange={(v) => patch(i, { title: v })}
              error={errors?.[i]}
              inputId={`agr-xf-title-${row.id}`}
            />
            <div className={cn(fieldRoot, "mt-3")}>
              <span className={fieldLabel}>Tipo de valor</span>
              <VtSelect
                value={row.valueKind}
                onChange={(v) => {
                  const valueKind =
                    v as TradeAgreementExtraFieldDraft["valueKind"];
                  patch(i, {
                    valueKind,
                    textValue:
                      valueKind === "text" ? row.textValue ?? "" : "",
                    mediaUrl: valueKind === "text" ? "" : row.mediaUrl,
                    fileName: valueKind === "text" ? "" : row.fileName,
                  });
                }}
                options={VALUE_KIND_OPTIONS}
                ariaLabel="Tipo de valor del campo adicional"
                listPortal
                listPortalZIndexClass="z-[240]"
                className="w-full max-w-md"
              />
            </div>
            {row.valueKind === "text" ? (
              <div className="mt-3">
                <label
                  className={fieldLabel}
                  htmlFor={`agr-xf-text-${row.id}`}
                >
                  Contenido
                </label>
                <textarea
                  id={`agr-xf-text-${row.id}`}
                  className="vt-input mt-1.5 min-h-[88px] w-full"
                  value={row.textValue}
                  onChange={(e) => patch(i, { textValue: e.target.value })}
                  placeholder="Texto del acuerdo para este ítem"
                />
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <input
                  id={fileInputId}
                  type="file"
                  className="sr-only"
                  accept={
                    row.valueKind === "image"
                      ? "image/*"
                      : "application/pdf,.pdf,.doc,.docx,.odt,application/*"
                  }
                  disabled={busy}
                  onChange={(e) => {
                    const input = e.currentTarget;
                    const f = input.files?.[0];
                    input.value = "";
                    const kind =
                      row.valueKind === "image" ? "image" : "document";
                    if (f) void handleFile(i, f, kind);
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor={fileInputId}
                    className={cn(
                      "vt-btn vt-btn-sm inline-flex cursor-pointer items-center gap-2",
                      busy && "pointer-events-none opacity-60",
                    )}
                  >
                    <Upload size={16} aria-hidden />
                    {row.valueKind === "image"
                      ? "Subir imagen"
                      : "Subir documento"}
                  </label>
                  {hasMedia ? (
                    <button
                      type="button"
                      className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1 text-[var(--muted)] hover:text-[#b91c1c]"
                      onClick={() => clearMedia(i)}
                      disabled={busy}
                    >
                      <X size={14} aria-hidden />
                      Quitar archivo
                    </button>
                  ) : null}
                </div>

                {busy ? (
                  <div className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-6">
                    <Loader2
                      className="h-6 w-6 animate-spin text-[var(--muted)]"
                      aria-hidden
                    />
                    <span className="text-[11px] font-semibold text-[var(--muted)]">
                      Subiendo…
                    </span>
                  </div>
                ) : hasMedia ? (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                      Vista previa
                    </div>
                    {row.valueKind === "image" ? (
                      <div className="mt-2">
                        <ProtectedMediaImg
                          src={row.mediaUrl.trim()}
                          alt=""
                          wrapperClassName="mx-auto block max-w-full"
                          className="mx-auto max-h-48 max-w-full rounded object-contain"
                        />
                        {row.fileName ? (
                          <p className="vt-muted mt-2 text-center text-[11px]">
                            {row.fileName}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <ProtectedMediaAnchor
                          href={row.mediaUrl.trim()}
                          className="inline-flex max-w-full items-center gap-2 text-[13px] font-semibold text-[var(--primary)]"
                        >
                          <FileText size={18} aria-hidden />
                          <span className="min-w-0 truncate">
                            {row.fileName?.trim() || "Abrir documento"}
                          </span>
                        </ProtectedMediaAnchor>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted)]">
                    Todavía no subiste un archivo.
                  </p>
                )}
              </div>
            )}
            {fields.length > 1 ? (
              <button
                type="button"
                className={cn(
                  "vt-btn vt-btn-ghost vt-btn-sm mt-3 text-[var(--muted)]",
                )}
                onClick={() => onChange(fields.filter((_, j) => j !== i))}
              >
                Quitar este campo
              </button>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        className="vt-btn"
        onClick={() =>
          onChange([...fields, emptyTradeAgreementExtraField(newRowScope)])
        }
      >
        + Añadir otro campo
      </button>
    </div>
  );
}
