import { FileText, XCircle } from "lucide-react";
import {
  ProtectedMediaAnchor,
  ProtectedMediaImg,
} from "@shared/components/media/ProtectedMediaImg";
import { mediaApiUrl } from "@shared/services/media/mediaClient";
import type { EvidenceAttachmentItem } from "@features/chat/Dtos/shared/evidenceAttachmentTypes";

function resolveAttachmentUrl(att: EvidenceAttachmentItem): string {
  const url = (att.url ?? "").trim();
  if (url.startsWith("/api/v1/media/") || /^https?:\/\//i.test(url)) return url;
  if (url.startsWith("med_")) return mediaApiUrl(url);
  const id = (att.id ?? "").trim();
  if (id.startsWith("med_")) return mediaApiUrl(id);
  return url;
}

function isImageAttachment(att: EvidenceAttachmentItem): boolean {
  const kind = (att.kind ?? "").trim().toLowerCase();
  if (kind === "image" || kind === "img") return true;
  const name = (att.fileName ?? "").trim().toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name);
}

export function EvidenceAttachmentsList({
  atts,
  onRemove,
  emptyLabel,
}: {
  atts: EvidenceAttachmentItem[];
  onRemove?: (id: string) => void;
  emptyLabel?: string;
}) {
  if (atts.length === 0) {
    if (!emptyLabel) return null;
    return <p className="vt-muted mt-2 text-[12px]">{emptyLabel}</p>;
  }

  return (
    <div className="mt-2 space-y-2">
      {atts.map((a) => {
        const href = resolveAttachmentUrl(a);
        const label = a.fileName?.trim() || "Abrir adjunto";
        return (
          <div
            key={a.id || href}
            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] px-2.5 py-2 text-[13px]"
          >
            <div className="min-w-0 flex-1">
              {isImageAttachment(a) && href ? (
                <ProtectedMediaImg
                  src={href}
                  alt={label}
                  wrapperClassName="block max-w-full"
                  className="max-h-48 w-full max-w-md rounded border border-[var(--border)] object-contain"
                />
              ) : href ? (
                <ProtectedMediaAnchor
                  href={href}
                  className="inline-flex min-w-0 items-center gap-2 break-words font-semibold text-[var(--primary)] underline"
                >
                  <FileText size={16} aria-hidden />
                  {label}
                </ProtectedMediaAnchor>
              ) : (
                <span className="vt-muted text-[12px]">{label}</span>
              )}
            </div>
            {onRemove ? (
              <button
                type="button"
                className="vt-btn vt-btn-ghost inline-flex shrink-0 items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-[12px]"
                onClick={() => onRemove(a.id)}
              >
                <XCircle size={14} aria-hidden />
                Quitar
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
