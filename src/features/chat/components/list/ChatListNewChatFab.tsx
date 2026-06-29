import { MessageCirclePlus } from 'lucide-react'

type Props = {
  chatListCount: number
  onNewConversation: () => void
}

export function ChatListNewChatFab({ chatListCount, onNewConversation }: Props) {
  return (
    <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] right-[max(1rem,calc(env(safe-area-inset-right,0px)+0.75rem))] z-[61]">
      <button
        type="button"
        className="pointer-events-auto relative grid size-14 place-items-center rounded-full border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[var(--primary)] text-white shadow-[0_10px_30px_rgba(15,23,42,0.28)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        title="Nuevo chat o grupo"
        aria-label="Nuevo chat o grupo"
        onClick={onNewConversation}
      >
        <MessageCirclePlus size={26} strokeWidth={2.25} aria-hidden />
        {chatListCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-white px-1 text-[10px] font-black leading-none text-[var(--primary)] shadow-sm ring-2 ring-[var(--primary)]">
            {chatListCount > 99 ? '99+' : chatListCount}
          </span>
        ) : (
          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-white shadow ring-2 ring-[var(--primary)]" />
        )}
      </button>
    </div>
  )
}
