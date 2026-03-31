import { useEffect, useMemo, useRef } from 'react'
import clsx from 'clsx'
import './onboarding.css'

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
    // keep parent value normalized
    const cleaned = value.replace(/[^\d]/g, '').slice(0, length)
    if (cleaned !== value) onChange(cleaned)
  }, [length, onChange, value])

  function setAt(i: number, d: string) {
    const next = digits.map((x, idx) => (idx === i ? d : x)).join('')
    onChange(next)
    if (next.length === length && !next.includes('')) onComplete?.(next)
  }

  return (
    <div className={clsx('vt-otp', error && 'vt-otp-error')} aria-label="Código de verificación">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className="vt-otp-slot"
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

