import type {
  ChangeEvent,
  Dispatch,
  Ref,
  RefObject,
  SetStateAction,
} from "react";
import {
  FileText,
  GitBranch,
  Mic,
  X,
} from "lucide-react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { cn } from "@shared/lib/cn";
import type { Thread } from "@features/market/logic/store/useMarketStore";
import { replySelectionAuthorLabel } from "@features/chat/logic/participants/chatParticipantLabels";
import { messagePreviewLine } from '@features/chat/logic/messages/chatAttachments';
import type { PendingDoc, PendingImg } from '@features/chat/Dtos/composer/chatComposerTypes';
import { ChatComposerBar } from './ChatComposerBar';

function formatVoiceDur(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

type Me = { id: string; name: string; trustScore: number };

type Props = {
  thread: Thread;
  me: Me;
  storeName: string;
  chatActionsLocked: boolean;
  draftInputRef: RefObject<HTMLInputElement | null>;
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  selected: Record<string, boolean>;
  setSelected: Dispatch<SetStateAction<Record<string, boolean>>>;
  selectedIds: string[];
  selectedOrdered: string[];
  pendingDocs: PendingDoc[];
  pendingImages: PendingImg[];
  pendingAudio: { url: string; seconds: number } | null;
  recording: boolean;
  recordSecs: number;
  voiceRecorderContainerRef: Ref<HTMLDivElement>;
  blockTextWithVoiceAndFiles: boolean;
  hasComposeToSend: boolean;
  canSend: boolean;
  onPickDocument: (e: ChangeEvent<HTMLInputElement>) => void;
  onPickImages: (e: ChangeEvent<HTMLInputElement>) => void;
  removePendingDoc: (id: string) => void;
  removePendingImage: (id: string) => void;
  removePendingAudio: () => void;
  submitComposer: () => void;
  toggleVoiceRecording: () => void;
  markThreadPaymentCompleted: (threadId: string) => void;
  pushNotification: (n: {
    kind: "payment";
    title: string;
    body: string;
  }) => void;
  setTrustScore: (n: number) => void;
};

export function ChatComposerSection({
  thread,
  me,
  storeName: _storeName,
  chatActionsLocked,
  draftInputRef,
  draft,
  setDraft,
  setSelected,
  selectedIds,
  selectedOrdered,
  pendingDocs,
  pendingImages,
  pendingAudio,
  recording,
  recordSecs,
  voiceRecorderContainerRef,
  blockTextWithVoiceAndFiles,
  hasComposeToSend,
  canSend,
  onPickDocument,
  onPickImages,
  removePendingDoc,
  removePendingImage,
  removePendingAudio,
  submitComposer,
  toggleVoiceRecording,
  markThreadPaymentCompleted: _markThreadPaymentCompleted,
  pushNotification: _pushNotification,
  setTrustScore: _setTrustScore,
}: Props) {
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames);

  const handleBackspaceEmpty = () => {
    if (pendingImages.length > 0) {
      const last = pendingImages[pendingImages.length - 1];
      removePendingImage(last.id);
      return;
    }
    if (pendingDocs.length > 0) {
      const last = pendingDocs[pendingDocs.length - 1];
      removePendingDoc(last.id);
      return;
    }
    if (pendingAudio) {
      removePendingAudio();
      return;
    }
    if (selectedOrdered.length > 0) {
      const last = selectedOrdered[selectedOrdered.length - 1];
      setSelected((s) => {
        const n = { ...s };
        delete n[last];
        return n;
      });
    }
  };

  return (
    <div
      className={cn(
        "vt-chat-composer-section flex shrink-0 flex-col overflow-visible",
        "min-[961px]:border-0 min-[961px]:bg-[var(--surface)] min-[961px]:shadow-none",
      )}
    >
      {selectedIds.length > 0 && (
        <div
          className="mx-3 mb-2 overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--muted)_22%,var(--border))] border-l-4 border-l-[#25d366] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] shadow-[0_1px_0_rgba(15,23,42,0.06)] min-[961px]:mx-4"
          role="region"
          aria-label="Respondiendo a mensajes en un hilo nuevo"
        >
          <div className="flex items-start gap-2.5 border-b border-dashed border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-gradient-to-br from-[color-mix(in_oklab,var(--primary)_14%,var(--surface))] to-[color-mix(in_oklab,#7c3aed_10%,var(--surface))] px-3 py-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[var(--primary)]"
              aria-hidden
            >
              <GitBranch size={18} strokeWidth={2.25} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] font-black tracking-[-0.02em] text-[var(--text)]">
                Nuevo hilo
              </span>
              <span className="text-[11px] leading-snug text-[var(--muted)]">
                Tu mensaje enlaza estas citas y se muestra como continuación de
                hilo
              </span>
            </div>
          </div>
          <div className="mb-2 flex items-center justify-between gap-2.5 px-3 pb-0 pl-3.5 pt-2.5">
            <span className="text-[13px] font-extrabold text-[color-mix(in_oklab,var(--text)_88%,var(--muted))]">
              Citas en este hilo ({selectedIds.length})
            </span>
            <button
              type="button"
              className="grid cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_14%,transparent)] hover:text-[var(--text)]"
              aria-label="Cancelar respuesta"
              title="Cancelar"
              onClick={() => setSelected({})}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="flex max-h-[140px] flex-col gap-2 overflow-y-auto px-3 pb-2.5 pl-3.5 pr-2.5">
            {selectedOrdered.map((id) => {
              const msg = thread.messages.find((x) => x.id === id);
              if (!msg || msg.type === "certificate") return null;
              const author = replySelectionAuthorLabel(
                msg,
                thread,
                me,
                profileDisplayNames,
              );
              const preview = messagePreviewLine(msg);
              return (
                <div key={id} className="flex min-w-0 items-start gap-2">
                  <span
                    className="mt-0.5 min-h-9 w-1 shrink-0 self-stretch rounded bg-gradient-to-b from-[#25d366] to-[color-mix(in_oklab,#25d366_65%,var(--primary))]"
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-xs font-extrabold text-[#25d366]">
                      {author}
                    </span>
                    <span className="line-clamp-2 text-xs leading-snug text-[var(--muted)]">
                      {preview}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="-mt-0.5 grid shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_12%,transparent)] hover:text-[var(--text)]"
                    aria-label={`Quitar cita a ${author}`}
                    onClick={() =>
                      setSelected((s) => {
                        const n = { ...s };
                        delete n[id];
                        return n;
                      })
                    }
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(pendingDocs.length > 0 ||
        pendingImages.length > 0 ||
        pendingAudio) && (
        <div
          className="flex min-h-0 flex-wrap items-end gap-2 px-3 py-2 min-[961px]:px-4"
          aria-label="Archivos listos para enviar"
        >
          {pendingDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex min-w-0 max-w-full flex-[1_1_200px] items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2.5 py-2"
            >
              <div className="shrink-0 text-[var(--muted)]" aria-hidden>
                <FileText size={22} strokeWidth={2} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-extrabold">
                  {doc.name}
                </span>
                <span className="text-[11px] text-[var(--muted)]">
                  {doc.size}
                </span>
              </div>
              <button
                type="button"
                className={cn(
                  "grid shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_12%,transparent)] hover:text-[var(--text)]",
                  chatActionsLocked && "pointer-events-none opacity-[0.35]",
                )}
                aria-label={`Quitar ${doc.name}`}
                onClick={() => removePendingDoc(doc.id)}
              >
                <X size={18} />
              </button>
            </div>
          ))}
          {pendingImages.map((img) => (
            <div
              key={img.id}
              className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-[var(--border)]"
            >
              <img
                src={img.url}
                alt=""
                className="block h-full w-full object-cover"
              />
              <button
                type="button"
                className={cn(
                  "absolute right-1 top-1 grid h-6 w-6 cursor-pointer place-items-center rounded-full border-0 bg-[rgba(15,23,42,0.65)] leading-none text-white hover:bg-[rgba(15,23,42,0.85)]",
                  chatActionsLocked && "pointer-events-none opacity-[0.35]",
                )}
                aria-label="Quitar imagen"
                onClick={() => removePendingImage(img.id)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {pendingAudio && (
            <div className="flex min-w-0 max-w-full flex-[1_1_200px] items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] px-2.5 py-2">
              <div
                className="grid shrink-0 place-items-center text-[var(--primary)]"
                aria-hidden
              >
                <Mic size={20} strokeWidth={2} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-extrabold">
                  Nota de voz
                </span>
                <span className="text-[11px] text-[var(--muted)]">
                  {formatVoiceDur(pendingAudio.seconds)}
                </span>
              </div>
              <button
                type="button"
                className={cn(
                  "grid shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_12%,transparent)] hover:text-[var(--text)]",
                  chatActionsLocked && "pointer-events-none opacity-[0.35]",
                )}
                aria-label="Quitar nota de voz"
                onClick={() => removePendingAudio()}
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {recording && (
        <div
          className="mx-3 mb-2 flex flex-col gap-2 rounded-[14px] border border-[color-mix(in_oklab,var(--primary)_38%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] p-2.5 shadow-[0_1px_0_rgba(15,23,42,0.04)] min-[961px]:mx-4"
          role="status"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[color-mix(in_oklab,var(--primary)_55%,transparent)] opacity-45" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--primary)]" />
            </span>
            <span className="min-w-0 truncate text-[12px] font-semibold text-[var(--text)]">
              Grabando nota de voz
            </span>
            <span className="ml-auto shrink-0 font-mono text-[13px] font-bold tabular-nums text-[var(--primary)]">
              {formatVoiceDur(recordSecs)}
            </span>
          </div>
          <div
            ref={voiceRecorderContainerRef}
            className="min-h-[50px] w-full overflow-hidden rounded-[10px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))]"
            aria-hidden
          />
          <p className="text-[11px] leading-snug text-[var(--muted)]">
            Toca el botón cuadrado para terminar y enviar.
          </p>
        </div>
      )}

      <ChatComposerBar
        draftInputRef={draftInputRef}
        draft={draft}
        setDraft={setDraft}
        recording={recording}
        recordSecs={recordSecs}
        blockTextWithVoiceAndFiles={blockTextWithVoiceAndFiles}
        chatActionsLocked={chatActionsLocked}
        hasComposeToSend={hasComposeToSend}
        canSend={canSend}
        pendingDocsCount={pendingDocs.length}
        pendingImagesCount={pendingImages.length}
        hasPendingAudio={!!pendingAudio}
        selectedCount={selectedIds.length}
        onPickDocument={onPickDocument}
        onPickImages={onPickImages}
        submitComposer={submitComposer}
        toggleVoiceRecording={toggleVoiceRecording}
        onBackspaceEmpty={handleBackspaceEmpty}
      />
    </div>
  );
}

export type { PendingImg, PendingDoc } from "@features/chat/Dtos/composer/chatComposerTypes";
