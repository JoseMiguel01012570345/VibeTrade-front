import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown, Search } from 'lucide-react'
import { COUNTRIES, type Country } from './countries'
import './onboarding.css'

export function CountrySelect({
  value,
  onChange,
}: {
  value: Country
  onChange: (c: Country) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const items = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return COUNTRIES
    return COUNTRIES.filter((c) => `${c.name} ${c.dial} ${c.code}`.toLowerCase().includes(s))
  }, [q])

  return (
    <div className="vt-country">
      <button
        type="button"
        className="vt-country-btn"
        onClick={() => setOpen((x) => !x)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="vt-country-flag">{value.flag}</span>
        <span className="vt-country-dial">{value.dial}</span>
        <span className="vt-country-name">{value.name}</span>
        <ChevronDown size={16} className={clsx('vt-country-chev', open && 'vt-rot')} />
      </button>

      {open && (
        <div className="vt-country-pop" role="listbox">
          <div className="vt-country-search">
            <Search size={16} />
            <input
              className="vt-country-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar país o código…"
              autoFocus
            />
          </div>
          <div className="vt-country-list">
            {items.map((c) => (
              <button
                type="button"
                key={c.code}
                className={clsx('vt-country-item', c.code === value.code && 'vt-country-item-active')}
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                  setQ('')
                }}
              >
                <span className="vt-country-flag">{c.flag}</span>
                <span className="vt-country-dial">{c.dial}</span>
                <span className="vt-country-name">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

