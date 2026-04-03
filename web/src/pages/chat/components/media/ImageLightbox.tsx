import { useEffect } from 'react'

export function ImageLightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!url) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [url, onClose])

  if (!url) return null
  return (
    <div
      className="fixed inset-0 z-[200] grid cursor-zoom-out place-items-center bg-[rgba(2,6,23,0.88)] p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Vista a pantalla completa"
      onClick={onClose}
    >
      <button
        type="button"
        className="fixed right-4 top-4 z-[201] grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-white/25 bg-[rgba(2,6,23,0.5)] text-[28px] leading-none text-white"
        onClick={onClose}
        aria-label="Cerrar"
      >
        ×
      </button>
      <img
        src={url}
        alt=""
        className="max-h-[min(100%,92vh)] max-w-[min(100%,96vw)] cursor-default rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
