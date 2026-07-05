import { lazy, Suspense } from 'react'
import { CeSpinner } from '@shared/components/ui/CeSpinner'
import type { ChatPaymentModalProps } from '@features/chat/Dtos/payments/chatPaymentModalTypes'

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
          <CeSpinner
            size="lg"
            className="text-[var(--primary)]"
            aria-hidden
          />
        </div>
      }
    >
      <ChatPaymentModalInner {...props} />
    </Suspense>
  )
}
