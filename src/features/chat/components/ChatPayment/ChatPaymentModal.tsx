import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import type { ChatPaymentModalProps } from './types'

const ChatPaymentModalInner = lazy(() =>
  import('./ChatPaymentModalInner').then((m) => ({
    default: m.ChatPaymentModalInner,
  })),
)

export function ChatPaymentModal(props: ChatPaymentModalProps) {
  if (!props.open) return null

  return (
    <Suspense
      fallback={
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(2,6,23,0.45)]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2
            className="h-9 w-9 animate-spin text-[var(--primary)]"
            aria-hidden
          />
        </div>
      }
    >
      <ChatPaymentModalInner {...props} />
    </Suspense>
  )
}
