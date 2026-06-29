import { Search } from 'lucide-react'

type Props = {
  value: string
  onChange: (value: string) => void
}

export function ChatListHeader({ value, onChange }: Props) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 pr-[max(5.25rem,calc(env(safe-area-inset-right,0px)+4.75rem))] sm:mb-8 sm:[grid-template-columns:auto_minmax(0,1fr)] sm:items-center">
      <h1 className="vt-h1 shrink-0 max-sm:w-full">Chats</h1>
      <div className="relative min-h-[42px] min-w-0 w-full md:max-w-md">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 z-[1] -translate-y-1/2 text-[var(--muted)]"
          size={17}
          strokeWidth={2.25}
          aria-hidden
        />
        <label htmlFor="chat-list-name-filter" className="sr-only">
          Filtrar chats por nombre
        </label>
        <input
          id="chat-list-name-filter"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nombre, tienda…"
          autoComplete="off"
          spellCheck={false}
          className="h-[42px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pe-3 ps-9 text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition focus-visible:border-[color-mix(in_oklab,var(--primary)_38%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_42%,transparent)]"
        />
      </div>
    </div>
  )
}
