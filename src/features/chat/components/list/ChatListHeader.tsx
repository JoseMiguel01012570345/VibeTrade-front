import { MessageCirclePlus, Search } from 'lucide-react'
import { CeIconButton } from '@shared/components/ui'

type Props = {
  value: string
  onChange: (value: string) => void
  onNewConversation?: () => void
}

export function ChatListHeader({ value, onChange, onNewConversation }: Props) {
  return (
    <div className="mb-3 flex flex-col gap-3 pr-[max(5.25rem,calc(env(safe-area-inset-right,0px)+4.75rem))] min-[961px]:mb-2 min-[961px]:pr-0 sm:flex-row sm:items-center">
      <div className="relative min-h-[42px] min-w-0 w-full flex-1 md:max-w-md">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 z-[1] -translate-y-1/2 text-[var(--muted)]"
          size={17}
          strokeWidth={2.25}
          aria-hidden
        />
        <label htmlFor="chat-list-name-filter" className="sr-only">
          Buscar o empezar un chat
        </label>
        <input
          id="chat-list-name-filter"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar o empezar un chat"
          autoComplete="off"
          spellCheck={false}
          className="vt-chat-list-search focus-visible:outline-none"
        />
      </div>
      {onNewConversation ? (
        <CeIconButton
          type="button"
          className="hidden min-[961px]:inline-flex shrink-0"
          title="Nuevo chat o grupo"
          aria-label="Nuevo chat o grupo"
          onClick={onNewConversation}
        >
          <MessageCirclePlus size={22} strokeWidth={2.25} aria-hidden />
        </CeIconButton>
      ) : null}
    </div>
  )
}
