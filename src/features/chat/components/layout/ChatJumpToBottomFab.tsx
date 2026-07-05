import { ChevronDown } from "lucide-react";

type Props = {
  visible: boolean;
  unreadBelowCount: number;
  onJump: () => void;
};

export function ChatJumpToBottomFab({
  visible,
  unreadBelowCount,
  onJump,
}: Props) {
  if (!visible) return null;
  return (
    <div className="vt-chat-jump-fab pointer-events-none absolute z-20">
      <button
        type="button"
        onClick={onJump}
        className="pointer-events-auto relative flex min-h-11 min-w-11 items-center justify-center gap-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[0_6px_24px_rgba(15,23,42,0.18)] transition hover:border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        aria-label={
          unreadBelowCount > 0
            ? `${unreadBelowCount > 99 ? "99+" : unreadBelowCount} mensajes nuevos, ir al final del chat`
            : "Ir al final del chat"
        }
        title="Ir al final del chat"
      >
        {unreadBelowCount > 0 ? (
          <span className="absolute -right-1.5 -top-2 flex min-h-5 min-w-5 select-none items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-black leading-none text-white shadow-sm">
            {unreadBelowCount > 99 ? "99+" : unreadBelowCount}
          </span>
        ) : null}
        <ChevronDown
          className="size-6 shrink-0"
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
    </div>
  );
}
