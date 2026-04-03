import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { finiteDuration, formatTime } from './audioHelpers'

export function AudioMicro({ url, seconds }: { url: string; seconds: number }) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(() => finiteDuration(seconds, seconds))

  const toggle = useCallback(() => {
    const a = ref.current
    if (!a) return
    if (playing) {
      a.pause()
    } else {
      void a.play()
    }
  }, [playing])

  useEffect(() => {
    setCur(0)
    setDur(finiteDuration(seconds, seconds))
  }, [url, seconds])

  useEffect(() => {
    const a = ref.current
    if (!a) return
    const onTime = () => {
      const t = a.currentTime
      setCur(Number.isFinite(t) && t >= 0 ? t : 0)
    }
    const onMeta = () => setDur(finiteDuration(a.duration, seconds))
    const onDurChange = () => setDur(finiteDuration(a.duration, seconds))
    const onEnd = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('durationchange', onDurChange)
    a.addEventListener('ended', onEnd)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('durationchange', onDurChange)
      a.removeEventListener('ended', onEnd)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
    }
  }, [seconds, url])

  const total = finiteDuration(dur, seconds)
  const pct = total > 0 ? Math.min(100, (cur / total) * 100) : 0

  return (
    <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2" data-chat-interactive>
      <audio ref={ref} src={url} preload="metadata" className="hidden" />
      <button
        type="button"
        className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
        onClick={toggle}
        aria-label={playing ? 'Pausa' : 'Reproducir'}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="h-1.5 min-w-[80px] flex-[1_1_120px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--muted)_22%,var(--surface))]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[color-mix(in_oklab,var(--primary)_70%,#7c3aed)] transition-[width] duration-80 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-[11px] [font-variant-numeric:tabular-nums] text-[var(--muted)]">
        {formatTime(cur)} / {formatTime(total)}
      </span>
    </div>
  )
}
