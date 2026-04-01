import { useState } from 'react'
import clsx from 'clsx'
import { trustValueToHue } from './reelRating'

type Props = {
  /** Promedio de valoraciones (-1…1); define color del indicador y posición del punto */
  value: number
  onChange: (v: number) => void
  compact?: boolean
  ariaLabel?: string
  /** Sin valoraciones aún: indicador gris (neutro) */
  unrated?: boolean
}

const GRAY_CLOSED = 'linear-gradient(155deg, hsl(220 10% 58%), hsl(220 12% 42%))'
const GRAY_OPEN =
  'linear-gradient(180deg, hsl(220 10% 62%) 0%, hsl(220 11% 48%) 50%, hsl(220 12% 38%) 100%)'

/** Valoración -1…1: vertical; color = promedio (rojo→verde) como los “likes” agregados */
export function ReelTrustSlider({ value, onChange, compact, ariaLabel, unrated }: Props) {
  const [open, setOpen] = useState(false)
  const hue = trustValueToHue(value)
  const mid = `hsl(${hue} 74% 44%)`
  const bgOpen = unrated
    ? GRAY_OPEN
    : `linear-gradient(180deg, hsl(120 74% 46%) 0%, ${mid} 50%, hsl(0 74% 48%) 100%)`
  const bgClosed = unrated ? GRAY_CLOSED : `linear-gradient(155deg, hsl(${hue} 72% 52%), hsl(${hue} 68% 36%))`
  const borderColor = unrated ? 'hsl(220 12% 70% / 0.5)' : `hsl(${hue} 45% 70% / 0.45)`
  const dotTop = unrated ? '50%' : `${((1 - (value + 1) / 2) * 100).toFixed(1)}%`
  const dotBg = unrated ? 'hsl(220 14% 96%)' : `hsl(${hue} 35% 97%)`
  const dotShadow = unrated ? '0 6px 16px hsl(220 25% 8% / 0.35)' : `0 6px 16px hsl(${hue} 50% 20% / 0.45)`

  return (
    <div
      role="slider"
      aria-label={ariaLabel ?? 'Valoración'}
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={unrated ? 0 : Math.round(value * 100) / 100}
      tabIndex={0}
      className={clsx(
        'vt-reel-trust',
        compact && 'vt-reel-trust--compact',
        open && 'vt-reel-trust-open',
        unrated && 'vt-reel-trust--unrated',
      )}
      style={{
        background: open ? bgOpen : bgClosed,
        borderColor,
      }}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onPointerDown={(e) => {
        setOpen(true)
        ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!open || e.buttons === 0) return
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        const y = (e.clientY - rect.top) / rect.height
        const v = 1 - Math.max(0, Math.min(1, y))
        onChange(v * 2 - 1)
      }}
    >
      <div
        className={clsx('vt-reel-trust-dot', unrated && 'vt-reel-trust-dot--center')}
        style={{
          top: dotTop,
          background: dotBg,
          boxShadow: dotShadow,
        }}
      />
    </div>
  )
}
