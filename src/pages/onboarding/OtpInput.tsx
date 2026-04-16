import { useEffect, useMemo, useRef } from 'react'
import { cn } from '../../lib/cn'

export function OtpInput({
  value,
  length,
  error,
  onChange,
  onComplete,
}: {
  value: string
  length: number
  error?: boolean
  onChange: (v: string) => void
  onComplete?: (v: string) => void
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = useMemo(() => {
    const cleaned = value.replace(/[^\d]/g, '').slice(0, length)
    return Array.from({ length }, (_, i) => cleaned[i] ?? '')
  }, [length, value])

  useEffect(() => {
    const cleaned = value.replace(/[^\d]/g, '').slice(0, length)
    if (cleaned !== value) onChange(cleaned)
  }, [length, onChange, value])

  function setAt(i: number, d: string) {
    const next = digits.map((x, idx) => (idx === i ? d : x)).join('')
    onChange(next)
    if (next.length === length && !next.includes('')) onComplete?.(next)
  }

  return (
    <div
      className={cn(
        'flex flex-row justify-between gap-[clamp(6px,2vw,10px)]',
        error && 'animate-[vt-shake_450ms_ease]',
      )}
      aria-label="Código de verificación"
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className={cn(
            'min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-[clamp(8px,2.6vw,12px)] text-center text-[clamp(14px,3.8vw,18px)] font-black outline-none',
            'w-[clamp(36px,12vw,52px)]',
            'focus:border-[color-mix(in_oklab,var(--primary)_70%,var(--border))] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)]',
            error && 'border-[color-mix(in_oklab,var(--bad)_70%,var(--border))]',
          )}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          value={d}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d]/g, '')
            const last = v.slice(-1)
            setAt(i, last)
            if (last && refs.current[i + 1]) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && refs.current[i - 1]) {
              refs.current[i - 1]?.focus()
            }
            if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus()
            if (e.key === 'ArrowRight') refs.current[i + 1]?.focus()
          }}
        />
      ))}
    </div>
  )
}
