import { MessageCircle } from 'lucide-react'

export function ChatDesktopPlaceholder() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <MessageCircle
        size={48}
        strokeWidth={1.25}
        className="mb-4 opacity-[0.35]"
        aria-hidden
      />
      <p className="vt-muted m-0 text-[15px]">Selecciona un chat para continuar</p>
    </div>
  )
}
