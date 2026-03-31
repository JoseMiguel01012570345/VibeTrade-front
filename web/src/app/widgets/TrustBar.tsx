import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { useAppStore } from '../store/useAppStore'
import './trustbar.css'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
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

  const pct = useMemo(() => {
    const min = -50
    const max = 100
    return ((clamp(me.trustScore, min, max) - min) / (max - min)) * 100
  }, [me.trustScore])

  const thresholdPct = useMemo(() => {
    const min = -50
    const max = 100
    return ((clamp(threshold, min, max) - min) / (max - min)) * 100
  }, [threshold])

  const locked = me.trustScore < threshold

  return (
    <>
      <div className="vt-trust">
        <div className="vt-trust-left">
          <div className="vt-trust-title">Barra de confianza</div>
          <div className={clsx('vt-trust-sub', locked && 'vt-trust-sub-warn')}>
            {locked ? 'Interacciones bloqueadas (solo mensualidad)' : 'Activa'}
          </div>
        </div>

        <div className="vt-trust-bar" role="img" aria-label="Barra de confianza">
          <div className="vt-trust-fill" style={{ width: `${pct}%` }} />
          <div className="vt-trust-threshold" style={{ left: `${thresholdPct}%` }} />
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
              <button className="vt-btn vt-btn-primary" onClick={() => setModal(null)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

