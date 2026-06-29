import { Loader2, PencilLine, Users, X } from "lucide-react";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import type { ChatThreadMemberDto } from "@features/chat/api/chatApi";

type Me = { id: string };

type Props = {
  me: Me;
  profileDisplayNames: Record<string, string>;
  profileAvatarUrls: Record<string, string>;
  mobileSheetOpen: boolean;
  onCloseMobileSheet: () => void;
  isSocialGroupCreator: boolean;
  threadSocialTitle: string | null | undefined;
  onOpenMembers: () => void;
  onOpenRename: () => void;
  socialMembersOpen: boolean;
  onCloseMembers: () => void;
  socialMembersLoading: boolean;
  socialMembersList: ChatThreadMemberDto[];
  socialRenameOpen: boolean;
  onCloseRename: () => void;
  socialRenameDraft: string;
  onSocialRenameDraftChange: (v: string) => void;
  onSubmitRename: () => void;
};

export function ChatSocialOverlays({
  me,
  profileDisplayNames,
  profileAvatarUrls,
  mobileSheetOpen,
  onCloseMobileSheet,
  isSocialGroupCreator,
  threadSocialTitle,
  onOpenMembers,
  onOpenRename,
  socialMembersOpen,
  onCloseMembers,
  socialMembersLoading,
  socialMembersList,
  socialRenameOpen,
  onCloseRename,
  socialRenameDraft,
  onSocialRenameDraftChange,
  onSubmitRename,
}: Props) {
  return (
    <>
      {mobileSheetOpen ? (
        <div
          className="fixed inset-0 z-[109] block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vt-chat-social-actions-sheet-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(2,6,23,0.52)] backdrop-blur-[3px]"
            aria-label="Cerrar menú de opciones"
            onClick={onCloseMobileSheet}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex max-h-[min(70dvh,420px)] w-full flex-col justify-end pb-[env(safe-area-inset-bottom,0px)] pt-10">
            <div className="pointer-events-auto flex max-h-[min(70dvh,420px)] flex-col rounded-t-[1.125rem] border border-b-0 border-[var(--border)] bg-[var(--surface)] pt-4 shadow-[0_-12px_40px_rgba(2,6,23,0.28)]">
              <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_oklab,var(--border)_80%,transparent)] px-4 pb-3 pt-1">
                <span
                  id="vt-chat-social-actions-sheet-title"
                  className="text-[15px] font-extrabold text-[var(--text)]"
                >
                  Más opciones
                </span>
                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[var(--muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  aria-label="Cerrar"
                  onClick={onCloseMobileSheet}
                >
                  <X size={20} strokeWidth={2.25} aria-hidden />
                </button>
              </div>
              <div className="overflow-y-auto px-3 pb-4 pt-3">
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="flex min-h-12 w-full shrink-0 items-center justify-start gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_42%,var(--surface))] px-4 py-3 text-left text-[13px] font-bold text-[var(--text)] transition hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))]"
                    onClick={() => {
                      onCloseMobileSheet();
                      onOpenMembers();
                    }}
                  >
                    <Users
                      size={18}
                      className="shrink-0 text-[var(--primary)]"
                      aria-hidden
                    />
                    Ver miembros del chat
                  </button>
                  {isSocialGroupCreator ? (
                    <button
                      type="button"
                      className="flex min-h-12 w-full shrink-0 items-center justify-start gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_42%,var(--surface))] px-4 py-3 text-left text-[13px] font-bold text-[var(--text)] transition hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))]"
                      onClick={() => {
                        onSocialRenameDraftChange(threadSocialTitle ?? "");
                        onOpenRename();
                        onCloseMobileSheet();
                      }}
                    >
                      <PencilLine
                        size={18}
                        className="shrink-0 text-[var(--primary)]"
                        aria-hidden
                      />
                      Cambiar nombre del chat
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {socialMembersOpen ? (
        <div
          className="fixed inset-0 z-[111] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vt-chat-social-members-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(2,6,23,0.52)] backdrop-blur-[3px]"
            aria-label="Cerrar"
            onClick={onCloseMembers}
          />
          <div className="relative z-[1] m-3 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_20px_60px_rgba(2,6,23,0.35)] sm:m-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2
                id="vt-chat-social-members-title"
                className="text-base font-extrabold text-[var(--text)]"
              >
                Miembros del chat
              </h2>
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                aria-label="Cerrar"
                onClick={onCloseMembers}
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            {socialMembersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2
                  className="size-8 animate-spin text-[var(--primary)]"
                  aria-hidden
                />
              </div>
            ) : (
              <ul className="max-h-[min(50dvh,320px)] space-y-2 overflow-y-auto pr-1">
                {socialMembersList.map((m) => {
                  const label =
                    m.displayName?.trim() ||
                    profileDisplayNames[m.userId]?.trim() ||
                    "Participante";
                  const memberAvatar =
                    m.avatarUrl?.trim() ||
                    profileAvatarUrls[m.userId]?.trim() ||
                    "";
                  return (
                    <li
                      key={m.userId}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_38%,var(--surface))] px-3 py-2.5"
                    >
                      {memberAvatar ? (
                        <ProtectedMediaImg
                          src={memberAvatar}
                          alt={label}
                          className="size-10 shrink-0 rounded-full object-cover"
                          wrapperClassName="size-10 shrink-0 overflow-hidden rounded-full"
                        />
                      ) : (
                        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--muted)_25%,var(--surface))] text-xs font-bold text-[var(--muted)]">
                          {(label.slice(0, 1) || "?").toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-[var(--text)]">
                          {label}
                        </div>
                        {m.userId === me.id ? (
                          <div className="text-[11px] font-semibold text-[var(--primary)]">
                            Tú
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {socialRenameOpen ? (
        <div
          className="fixed inset-0 z-[111] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vt-chat-social-rename-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(2,6,23,0.52)] backdrop-blur-[3px]"
            aria-label="Cerrar"
            onClick={onCloseRename}
          />
          <div className="relative z-[1] m-3 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_20px_60px_rgba(2,6,23,0.35)] sm:m-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2
                id="vt-chat-social-rename-title"
                className="text-base font-extrabold text-[var(--text)]"
              >
                Nombre del chat
              </h2>
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                aria-label="Cerrar"
                onClick={onCloseRename}
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Solo vos podés cambiar este nombre; los demás lo verán en la lista
              y arriba del chat.
            </p>
            <input
              type="text"
              value={socialRenameDraft}
              onChange={(e) => onSocialRenameDraftChange(e.target.value)}
              maxLength={120}
              placeholder="Ej. Plan finde, Familia…"
              className="mb-4 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm font-semibold text-[var(--text)] outline-none ring-[var(--primary)] focus-visible:ring-2"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="vt-btn border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]"
                onClick={onCloseRename}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="vt-btn"
                onClick={() => void onSubmitRename()}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
