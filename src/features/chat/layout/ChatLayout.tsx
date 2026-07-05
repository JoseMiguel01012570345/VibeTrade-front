import { Outlet, useParams } from 'react-router-dom'
import { useMinWidth961 } from '../hooks/useMinWidth961'
import { ChatListPanel } from '../components/list/ChatListPanel'
import { ChatDesktopPlaceholder } from '../components/list/ChatDesktopPlaceholder'
import '../styles/chat.css'

export function ChatLayout() {
  const wide = useMinWidth961()
  const { threadId } = useParams()

  return (
    <div className="vt-page vt-chat-layout vt-chat-page flex min-h-0 w-full flex-1 flex-col">
      {(wide || !threadId) && (
        <aside className="vt-chat-layout__list flex min-h-0 flex-1 flex-col min-[961px]:flex-none">
          <ChatListPanel activeThreadId={threadId} />
        </aside>
      )}
      {wide ? (
        <section className="vt-chat-layout__conversation">
          {threadId ? <Outlet /> : <ChatDesktopPlaceholder />}
        </section>
      ) : threadId ? (
        <section className="vt-chat-layout__conversation flex min-h-0 flex-1 flex-col">
          <Outlet />
        </section>
      ) : null}
    </div>
  )
}
