import { createPortal } from 'react-dom'
import { ChatPaymentModalBody } from './ChatPaymentModalBody'
import { useChatPaymentModal } from '@features/chat/hooks/useChatPaymentModal'
import type { ChatPaymentModalProps } from '@features/chat/Dtos/payments/chatPaymentModalTypes'

export function ChatPaymentModalInner({
  open,
  onClose,
  ...rest
}: ChatPaymentModalProps) {
  const vm = useChatPaymentModal({ open, onClose, ...rest })

  if (!open) return null

  return createPortal(
    <ChatPaymentModalBody vm={vm} onClose={onClose} />,
    document.body,
  )
}
