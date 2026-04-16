import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../../lib/cn'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function useFluidPct(target: number) {
  const [v, setV] = useState(target)
  const vRef = useRef(target)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current)

    const step = () => {
      const cur = vRef.current
      const delta = target - cur
      const next = cur + delta * 0.18 // smoothing factor => "fluido"
      vRef.current = next
      setV(next)
      if (Math.abs(delta) > 0.08) raf.current = requestAnimationFrame(step)
      else {
        vRef.current = target
        setV(target)
        raf.current = null
      }
    }

    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target])

  return v
}

export function TrustBar() {
  const me = useAppStore((s) => s.me)
  const threshold = useAppStore((s) => s.trustThreshold)
  const [modal, setModal] = useState<null | 'below' | 'above'>(null)
  const prevState = useRef<'below' | 'above'>(me.trustScore < threshold ? 'below' : 'above')

  useEffect(() => {
    const state = me.trustScore < threshold ? 'below' : 'above'
    if (state !== prevState.current) {
      setModal(state)
      prevState.current = state
    }
  }, [me.trustScore, threshold])

  const pctTarget = useMemo(() => {
    const min = -50
    const max = 100
    return ((clamp(me.trustScore, min, max) - min) / (max - min)) * 100
  }, [me.trustScore])

  const pct = useFluidPct(pctTarget)

  const thresholdPct = useMemo(() => {
    const min = -50
    const max = 100
    return ((clamp(threshold, min, max) - min) / (max - min)) * 100
  }, [threshold])

  const locked = me.trustScore < threshold

  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-bold tracking-[-0.02em]">Barra de confianza</div>
          <div
            className={cn(
              'text-xs text-[var(--muted)]',
              locked && 'font-semibold text-[color-mix(in_oklab,var(--bad)_75%,var(--muted))]',
            )}
          >
            {locked ? 'Interacciones bloqueadas (solo mensualidad)' : 'Activa'}
          </div>
        </div>

        <div className="vt-trust-bar" role="img" aria-label="Barra de confianza">
          <div
            className="vt-trust-fill"
            style={{ width: `${pct}%` }}
            data-moving={Math.abs(pctTarget - pct) > 0.2 ? '1' : '0'}
          />
          <div
            className="vt-trust-threshold"
            style={{ left: `${thresholdPct}%` }}
            title="Umbral de confianza: si bajás de este nivel se bloquean las interacciones y solo podrás pagar tu mensualidad."
            aria-label="Umbral de confianza: si bajás de este nivel se bloquean las interacciones"
            role="img"
          />
          <div className="vt-trust-score" aria-label="Puntaje de confianza">
            {me.trustScore}
          </div>
        </div>
      </div>

      {modal && (
        <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="vt-modal">
            <div className="vt-modal-title">
              {modal === 'below' ? 'Bajaste del umbral' : 'Volviste al umbral'}
            </div>
            <div className="vt-modal-body">
              {modal === 'below' ? (
                <>
                  Tu puntaje quedó por debajo del umbral. Se deshabilitan interacciones en la plataforma,
                  excepto el pago de tu mensualidad.
                </>
              ) : (
                <>Tu puntaje volvió a estar por encima del umbral. Las interacciones quedan habilitadas.</>
              )}
            </div>
            <div className="vt-modal-actions">
              <button type="button" className="vt-btn vt-btn-primary" onClick={() => setModal(null)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
