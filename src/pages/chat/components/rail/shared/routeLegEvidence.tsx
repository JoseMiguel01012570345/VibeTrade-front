import { Button } from "flowbite-react";
import { XCircle } from "lucide-react";
import type { ServiceEvidenceAttachmentApi } from "../../../../../utils/chat/agreementServiceEvidenceApi";

export function normalizeCarrierEvidenceForCompare(
  text: string,
  atts: ServiceEvidenceAttachmentApi[],
): { text: string; attsKey: string } {
  const t = (text ?? "").trim();
  const key = (atts ?? [])
    .map((a) => ({
      url: (a.url ?? "").trim(),
      fileName: (a.fileName ?? "").trim(),
      kind: (a.kind ?? "").trim(),
    }))
    .sort((a, b) =>
      `${a.url}|${a.fileName}|${a.kind}`.localeCompare(
        `${b.url}|${b.fileName}|${b.kind}`,
        "es",
      ),
    )
    .map((a) => `${a.url}|${a.fileName}|${a.kind}`)
    .join(";;");
  return { text: t, attsKey: key };
}

export function RouteLegEvidenceAttachmentsList({
  atts,
  onRemove,
}: {
  atts: ServiceEvidenceAttachmentApi[];
  onRemove?: (id: string) => void;
}) {
  if (atts.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {atts.map((a) => (
        <div
          key={a.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-700/50"
        >
          <a
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 break-words text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
          >
            {a.fileName || "Abrir adjunto"}
          </a>
          {onRemove ? (
            <Button
              aria-label={`Quitar ${a.fileName || "adjunto"}`}
              className="shrink-0"
              color="gray"
              size="xs"
              onClick={() => onRemove(a.id)}
            >
              <span className="inline-flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" aria-hidden />
                Quitar
              </span>
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
