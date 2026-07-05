import { useState } from 'react'
import { useAppStore } from '@features/auth/logic/useAppStore'
import { useChatListPage } from '../../hooks/useChatListPage'
import { useChatListRows } from '../../hooks/useChatListRows'
import { useChatLeaveFlow } from '../../hooks/useChatLeaveFlow'
import { ChatNewConversationModal } from '../modals/ChatNewConversationModal'
import { ChatListHeader } from './ChatListHeader'
import { ChatListEmptyState } from './ChatListEmptyState'
import { ChatListThreadRow } from './ChatListThreadRow'
import { ChatListLeaveModals } from './ChatListLeaveModals'
import { ChatListNewChatFab } from './ChatListNewChatFab'

type Props = {
  activeThreadId?: string
}

export function ChatListPanel({ activeThreadId }: Props) {
  useChatListPage()

  const me = useAppStore((s) => s.me)
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames)
  const [nameFilterQuery, setNameFilterQuery] = useState('')
  const [newConversationOpen, setNewConversationOpen] = useState(false)

  const { rows, hasThreads } = useChatListRows(nameFilterQuery)
  const leave = useChatLeaveFlow()

  return (
    <div className="vt-chat-list-panel relative flex min-h-0 flex-1 flex-col">
      <ChatNewConversationModal
        open={newConversationOpen}
        onClose={() => setNewConversationOpen(false)}
      />
      <ChatListLeaveModals {...leave} />

      <div className="shrink-0 px-1 pt-1 sm:px-0 min-[961px]:px-3 min-[961px]:pt-3">
        <ChatListHeader
          value={nameFilterQuery}
          onChange={setNameFilterQuery}
          onNewConversation={
            me.id !== 'guest' ? () => setNewConversationOpen(true) : undefined
          }
        />
      </div>

      <div className="vt-chat-list-panel__body min-h-0 flex-1 overflow-y-auto pb-0 min-[961px]:px-0">
        {!hasThreads ? (
          <div className="px-1 sm:px-0 min-[961px]:px-3">
            <ChatListEmptyState variant="no-threads" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-1 sm:px-0 min-[961px]:px-3">
            <ChatListEmptyState
              variant="no-filter-match"
              filterQuery={nameFilterQuery}
              onClearFilter={() => setNameFilterQuery('')}
            />
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map(({ th, preview, at, listTitle }) => (
              <ChatListThreadRow
                key={th.id}
                th={th}
                listTitle={listTitle}
                preview={preview}
                at={at}
                meId={me.id}
                meName={me.name}
                profileDisplayNames={profileDisplayNames}
                activeThreadId={activeThreadId}
                onLeave={leave.openLeaveModal}
              />
            ))}
          </div>
        )}
      </div>

      {me.id !== 'guest' ? (
        <ChatListNewChatFab
          onNewConversation={() => setNewConversationOpen(true)}
        />
      ) : null}
    </div>
  )
}


