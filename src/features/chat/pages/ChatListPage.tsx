import { useState } from 'react'
import { useAppStore } from '@features/auth/model/useAppStore'
import { useChatListPage } from '../hooks/useChatListPage'
import { useChatListRows } from '../hooks/useChatListRows'
import { useChatLeaveFlow } from '../hooks/useChatLeaveFlow'
import { ChatNewConversationModal } from '../components/modals/ChatNewConversationModal'
import { ChatListHeader } from '../components/list/ChatListHeader'
import { ChatListEmptyState } from '../components/list/ChatListEmptyState'
import { ChatListThreadRow } from '../components/list/ChatListThreadRow'
import { ChatListLeaveModals } from '../components/list/ChatListLeaveModals'
import { ChatListNewChatFab } from '../components/list/ChatListNewChatFab'

export function ChatListPage() {
  useChatListPage()

  const me = useAppStore((s) => s.me)
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames)
  const [nameFilterQuery, setNameFilterQuery] = useState('')
  const [newConversationOpen, setNewConversationOpen] = useState(false)

  const { rows, chatListCount, hasThreads } = useChatListRows(nameFilterQuery)
  const leave = useChatLeaveFlow()

  return (
    <div className="container vt-page relative">
      <ChatNewConversationModal
        open={newConversationOpen}
        onClose={() => setNewConversationOpen(false)}
      />
      <ChatListLeaveModals {...leave} />

      <ChatListHeader
        value={nameFilterQuery}
        onChange={setNameFilterQuery}
      />

      <div className="vt-card vt-card-pad">
        {!hasThreads ? (
          <ChatListEmptyState variant="no-threads" />
        ) : rows.length === 0 ? (
          <ChatListEmptyState
            variant="no-filter-match"
            filterQuery={nameFilterQuery}
            onClearFilter={() => setNameFilterQuery('')}
          />
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
                onLeave={leave.openLeaveModal}
              />
            ))}
          </div>
        )}
      </div>

      {me.id !== 'guest' ? (
        <ChatListNewChatFab
          chatListCount={chatListCount}
          onNewConversation={() => setNewConversationOpen(true)}
        />
      ) : null}
    </div>
  )
}
