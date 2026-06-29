import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@shared/lib/cn'

type Props = Readonly<{
  value: string
  onChange: (value: string) => void
  autoComplete?: 'current-password' | 'new-password'
  id?: string
  className?: string
}>

export function PasswordInput({
  value,
  onChange,
  autoComplete = 'current-password',
  id,
  className,
}: Props) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const [visible, setVisible] = useState(false)

  return (
    <div className={cn('relative', className)}>
      <input
        id={inputId}
        className="vt-input w-full pr-11"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-[var(--muted)] transition hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
        aria-controls={inputId}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  )
}
