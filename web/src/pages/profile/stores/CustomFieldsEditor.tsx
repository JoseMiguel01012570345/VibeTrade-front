import { useState } from "react";
import { FileText, Loader2, Plus, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  ProtectedMediaAnchor,
  ProtectedMediaImg,
} from "../../../components/media/ProtectedMediaImg";
import { cn } from "../../../lib/cn";
import type { StoreCustomField } from "../../chat/domain/storeCatalogTypes";
import {
  PROFILE_DESC_MIN,
  PROFILE_TITLE_MIN,
} from "../profileStoreFormValidation";
import {
  fieldLabel,
  fieldRootWithInvalid,
  textareaMin,
} from "../../chat/styles/formModalStyles";
import { fileToKind, newAttachmentId, revokeIfBlob } from "./helpers";
import {
  isProtectedMediaUrl,
  mediaApiUrl,
  releaseMediaObjectUrl,
  uploadMedia,
} from "../../../utils/media/mediaClient";

type Props = Readonly<{
  fields: StoreCustomField[];
  onChange: (next: StoreCustomField[]) => void;
  showValidation?: boolean;
  /** true mientras corre la subida de archivos (overlay en el padre). */
  onUploadingChange?: (busy: boolean) => void;
}>;

export function CustomFieldsEditor({
  fields,
  onChange,
  showValidation,
  onUploadingChange,
}: Props) {
  /** Cantidad de archivos en subida por fila (placeholders con spinner). */
  const [pendingByField, setPendingByField] = useState<Record<number, number>>(
    {},
  );

  function bumpPending(idx: number, delta: number) {
    setPendingByField((p) => {
      const next = { ...p };
      const v = (next[idx] ?? 0) + delta;
      if (v <= 0) delete next[idx];
      else next[idx] = v;
      return next;
    });
  }

  function patchField(idx: number, patch: Partial<StoreCustomField>) {
    onChange(fields.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function addAttachments(idx: number, fileList: FileList | File[] | null) {
    void (async () => {
      let files: File[] = [];
      if (fileList != null) {
        files = Array.isArray(fileList) ? fileList : Array.from(fileList);
      }
      if (!files.length) return;
      bumpPending(idx, files.length);
      onUploadingChange?.(true);
      try {
        const row = fields[idx];
        const list = [...(row.attachments ?? [])];
        for (const file of files) {
          try {
            const uploaded = await uploadMedia(file);
            const url = mediaApiUrl(uploaded.id);
            list.push({
              id: newAttachmentId(),
              url,
              fileName: file.name,
              kind: fileToKind(file),
            });
          } catch (e) {
            const msg =
              e instanceof Error && e.message
                ? e.message
                : `No se pudo subir: ${file.name}`;
            toast.error(msg);
          } finally {
            bumpPending(idx, -1);
          }
        }
        patchField(idx, { attachments: list });
      } finally {
        onUploadingChange?.(false);
      }
    })();
  }

  function removeAttachment(idx: number, attachmentId: string) {
    const row = fields[idx];
    const hit = row.attachments?.find((a) => a.id === attachmentId);
    if (hit) {
      if (isProtectedMediaUrl(hit.url)) releaseMediaObjectUrl(hit.url);
      revokeIfBlob(hit.url);
    }
    const nextAtt = row.attachments?.filter((a) => a.id !== attachmentId);
    patchField(idx, { attachments: nextAtt?.length ? nextAtt : undefined });
  }

  function removeField(idx: number) {
    const row = fields[idx];
    row.attachments?.forEach((a) => {
      if (isProtectedMediaUrl(a.url)) releaseMediaObjectUrl(a.url);
      revokeIfBlob(a.url);
    });
    onChange(fields.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={fieldLabel}>
          Otros campos (título, texto embebido y archivos)
        </span>
        <button
          type="button"
          className="vt-btn vt-btn-sm"
          onClick={() => onChange([...fields, { title: "", body: "" }])}
        >
          <Plus size={14} /> Añadir campo
        </button>
      </div>
      <p className="vt-muted mb-2 text-[11px] leading-snug">
        Cada campo debe quedar completo antes de guardar. Subí imágenes o
        PDF/documentos con el botón; podés quitar o reemplazar archivos desde
        esta misma vista en modo edición.
      </p>
      <div className="flex flex-col gap-3">
        {fields.map((cf, idx) => {
          const idInput = `custom-field-upload-${idx}`;
          const titleInvalid =
            showValidation && cf.title.trim().length < PROFILE_TITLE_MIN;
          const bodyInvalid =
            showValidation && cf.body.trim().length < PROFILE_DESC_MIN;
          const hasPreview = !!(
            cf.title.trim() ||
            cf.body.trim() ||
            (cf.attachments?.length ?? 0) > 0 ||
            (pendingByField[idx] ?? 0) > 0
          );
          return (
            <div
              key={`${idx}-${cf.title}`}
              className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3"
            >
              <label className={fieldRootWithInvalid(titleInvalid)}>
                <span className={fieldLabel}>Título del campo</span>
                <input
                  className="vt-input"
                  placeholder="Ej: Certificación orgánica"
                  value={cf.title}
                  onChange={(e) => patchField(idx, { title: e.target.value })}
                />
              </label>
              <label className={cn(fieldRootWithInvalid(bodyInvalid), "mt-2")}>
                <span className={fieldLabel}>Texto embebido</span>
                <textarea
                  className={cn("vt-input", textareaMin)}
                  placeholder={`Descripción o contexto (mín. ${PROFILE_DESC_MIN} caracteres al guardar)`}
                  value={cf.body}
                  onChange={(e) => patchField(idx, { body: e.target.value })}
                  rows={3}
                />
              </label>
              <label className={fieldRootWithInvalid(false)}>
                <span className={fieldLabel}>
                  Leyenda junto a adjuntos (opcional)
                </span>
                <input
                  className="vt-input mt-1"
                  placeholder="Ej: Vista del certificado 2024"
                  value={cf.attachmentNote ?? ""}
                  onChange={(e) =>
                    patchField(idx, { attachmentNote: e.target.value })
                  }
                />
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  id={idInput}
                  type="file"
                  className="sr-only"
                  accept="image/*,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  onChange={(e) => {
                    const input = e.currentTarget;
                    const picked = input.files ? Array.from(input.files) : [];
                    input.value = "";
                    addAttachments(idx, picked);
                  }}
                />
                <label
                  htmlFor={idInput}
                  className="vt-btn vt-btn-sm inline-flex cursor-pointer items-center gap-2"
                >
                  <Upload size={16} aria-hidden /> Subir fotos o documentos
                </label>
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm text-[#b91c1c]"
                  onClick={() => removeField(idx)}
                >
                  Eliminar este campo
                </button>
              </div>
              {hasPreview ? (
                <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                    Vista previa
                  </div>
                  {cf.title.trim() ? (
                    <div className="mt-1 font-bold text-[var(--text)]">
                      {cf.title}
                    </div>
                  ) : null}
                  {cf.body.trim() ? (
                    <p className="vt-muted mt-1 whitespace-pre-wrap text-[13px] leading-snug">
                      {cf.body}
                    </p>
                  ) : null}
                  {cf.attachmentNote?.trim() ? (
                    <p className="mt-1 text-[12px] italic text-[var(--muted)]">
                      {cf.attachmentNote}
                    </p>
                  ) : null}
                  {(cf.attachments?.length ?? 0) > 0 ||
                  (pendingByField[idx] ?? 0) > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cf.attachments?.map((att) => (
                        <div
                          key={att.id}
                          className="relative rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] p-1.5"
                        >
                          {att.kind === "image" ? (
                            <ProtectedMediaImg
                              src={att.url}
                              alt=""
                              wrapperClassName="mx-auto block max-w-[140px]"
                              className="mx-auto max-h-28 max-w-[140px] rounded object-contain"
                            />
                          ) : (
                            <ProtectedMediaAnchor
                              href={att.url}
                              className="flex max-w-[180px] items-center gap-2 text-[12px] font-semibold text-[var(--primary)]"
                            >
                              <FileText size={18} aria-hidden />
                              <span className="truncate">{att.fileName}</span>
                            </ProtectedMediaAnchor>
                          )}
                          <button
                            type="button"
                            className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[#b91c1c]"
                            title="Quitar archivo"
                            aria-label="Quitar archivo"
                            onClick={() => removeAttachment(idx, att.id)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      {Array.from({
                        length: pendingByField[idx] ?? 0,
                      }).map((_, pi) => (
                        <div
                          key={`pending-${idx}-${pi}`}
                          className="relative flex min-h-[7rem] min-w-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-4"
                        >
                          <Loader2
                            className="h-6 w-6 animate-spin text-[var(--muted)]"
                            aria-hidden
                          />
                          <span className="text-[10px] font-semibold text-[var(--muted)]">
                            Subiendo…
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
