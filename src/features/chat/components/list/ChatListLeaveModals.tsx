import { ChatLeaveConfirmModal } from '../modals/ChatLeaveConfirmModal'
import { ChatLeaveReasonModal } from '../modals/ChatLeaveReasonModal'
import type { useChatLeaveFlow } from '../../hooks/useChatLeaveFlow'

type LeaveFlow = ReturnType<typeof useChatLeaveFlow>

type Props = LeaveFlow

export function ChatListLeaveModals({
  leaveModalThreadId,
  leaveBlockingCode,
  leaveBlockingMessage,
  leaveRefundSuggestion,
  leaveRefundBusy,
  leaveReasonModalThreadId,
  leaveReasonBusy,
  leaveReasonError,
  closeLeaveModal,
  closeLeaveReasonModal,
  handleLeaveConfirm,
  handleLeaveReasonConfirm,
  handleRequestRefund,
}: Props) {
  return (
    <>
      <ChatLeaveConfirmModal
        open={leaveModalThreadId !== null}
        variant="list"
        onClose={closeLeaveModal}
        blockingCode={leaveBlockingCode}
        blockingMessage={leaveBlockingMessage}
        refundSuggestion={leaveRefundSuggestion}
        refundBusy={leaveRefundBusy}
        onRequestRefund={
          leaveRefundSuggestion ? handleRequestRefund : undefined
        }
        onConfirm={handleLeaveConfirm}
      />
      <ChatLeaveReasonModal
        open={leaveReasonModalThreadId !== null}
        busy={leaveReasonBusy}
        emptyReasonError={leaveReasonError}
        onClose={closeLeaveReasonModal}
        onConfirm={handleLeaveReasonConfirm}
      />
    </>
  )
}
