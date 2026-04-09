import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Country } from './countries'

export function CountrySelect({
  countries,
  value,
  onChange,
}: {
  countries: Country[]
  value: Country
  onChange: (c: Country) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const items = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return countries
    return countries.filter((c) =>
      `${c.name} ${c.dial} ${c.code}`.toLowerCase().includes(s),
    )
  }, [countries, q])

  return (
    <div className="relative">
      <button
        type="button"
        className="grid w-full cursor-pointer grid-cols-[auto_auto_1fr_auto] items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left"
        onClick={() => setOpen((x) => !x)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-base">{value.flag}</span>
        <span className="text-xs font-extrabold text-[var(--muted)]">{value.dial}</span>
        <span className="font-bold">{value.name}</span>
        <ChevronDown size={16} className={cn('text-[var(--muted)] transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]"
          role="listbox"
        >
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 text-[var(--muted)]">
            <Search size={16} />
            <input
              className="w-full border-0 bg-transparent outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar país o código…"
              autoFocus
            />
          </div>
          <div className="max-h-[260px] overflow-auto">
            {items.map((c) => (
              <button
                type="button"
                key={c.code}
                className={cn(
                  'grid w-full cursor-pointer grid-cols-[auto_auto_1fr] items-center gap-2.5 border-0 bg-transparent px-3 py-2.5 text-left',
                  'hover:bg-[color-mix(in_oklab,var(--primary)_6%,transparent)]',
                  c.code === value.code && 'bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]',
                )}
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                  setQ('')
                }}
              >
                <span className="text-base">{c.flag}</span>
                <span className="text-xs font-extrabold text-[var(--muted)]">{c.dial}</span>
                <span className="font-bold">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
