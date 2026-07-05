import { MessageCirclePlus } from 'lucide-react'

type Props = {
  onNewConversation: () => void
}

export function ChatListNewChatFab({ onNewConversation }: Props) {
  return (
    <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] right-[max(1rem,calc(env(safe-area-inset-right,0px)+0.75rem))] z-[61] max-[960px]:block min-[961px]:hidden">
      <button
        type="button"
        className="pointer-events-auto grid size-14 place-items-center rounded-full border border-[#0d5f4a] bg-[#0f766e] text-white shadow-[0_10px_28px_rgba(15,118,110,0.38)] transition hover:bg-[#0d6b64] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
        title="Nuevo chat"
        aria-label="Nuevo chat"
        onClick={onNewConversation}
      >
        <MessageCirclePlus size={26} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}
