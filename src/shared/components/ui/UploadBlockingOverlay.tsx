import { Loader2 } from 'lucide-react'

type Props = Readonly<{
  active: boolean
  message?: string
}>

/** Pantalla completa bloqueante durante subida de archivos. */
export function UploadBlockingOverlay({
  active,
  message = 'Subiendo…',
}: Props) {
  if (!active) return null
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3 bg-black/45 backdrop-blur-[2px]"
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 className="h-10 w-10 animate-spin text-white" aria-hidden />
      <p className="text-sm font-bold text-white">{message}</p>
    </div>
  )
}
