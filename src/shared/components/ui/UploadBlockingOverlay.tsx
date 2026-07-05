import { CeSpinner } from '@shared/components/ui/CeSpinner'

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
      <CeSpinner size="lg" className="text-white" aria-hidden />
      <p className="text-sm font-bold text-white">{message}</p>
    </div>
  )
}
