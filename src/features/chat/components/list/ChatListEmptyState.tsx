import { MessageCircle, Search } from 'lucide-react'

type Props =
  | { variant: 'no-threads' }
  | {
      variant: 'no-filter-match'
      filterQuery: string
      onClearFilter: () => void
    }

export function ChatListEmptyState(props: Props) {
  if (props.variant === 'no-threads') {
    return (
      <div className="px-4 py-7 text-center">
        <MessageCircle
          size={40}
          strokeWidth={1.25}
          className="mb-3 opacity-[0.35]"
        />
        <div className="vt-muted">Todavía no tienes conversaciones.</div>
        <div className="vt-muted mt-1.5 text-[13px]">
          Abre una oferta y toca «Comprar» para iniciar un chat.
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-7 text-center">
      <Search
        size={40}
        strokeWidth={1.25}
        className="mb-3 mx-auto opacity-[0.35]"
        aria-hidden
      />
      <div className="vt-muted">
        No hay chats que coincidan con «{props.filterQuery.trim()}».
      </div>
      <button
        type="button"
        className="vt-btn vt-btn-ghost mt-4"
        onClick={props.onClearFilter}
      >
        Quitar filtro
      </button>
    </div>
  )
}
