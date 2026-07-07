import { useCallback, useRef, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useMinWidth961 } from '../hooks/useMinWidth961'
import { ChatListPanel } from '../components/list/ChatListPanel'
import { ChatDesktopPlaceholder } from '../components/list/ChatDesktopPlaceholder'
import '../styles/chat.css'

const DEFAULT_LIST_WIDTH = 380
const MIN_LIST_WIDTH = 260
const MAX_LIST_WIDTH = 560

export function ChatLayout() {
  const wide = useMinWidth961()
  const { threadId } = useParams()
  const [listWidth, setListWidth] = useState(DEFAULT_LIST_WIDTH)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStartX.current = e.clientX
    dragStartWidth.current = listWidth

    const handleMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - dragStartX.current
      const nextWidth = Math.min(
        Math.max(dragStartWidth.current + delta, MIN_LIST_WIDTH),
        MAX_LIST_WIDTH,
      )
      setListWidth(nextWidth)
    }

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }, [listWidth])

  return (
    <div className="vt-page vt-chat-layout vt-chat-page flex min-h-0 w-full flex-1 flex-col">
      {(wide || !threadId) && (
        <aside
          className="vt-chat-layout__list flex min-h-0 flex-1 flex-col min-[961px]:flex-none"
          style={wide ? { width: listWidth, minWidth: listWidth, maxWidth: listWidth } : undefined}
        >
          <ChatListPanel activeThreadId={threadId} />
        </aside>
      )}
      {wide ? (
        <div
          className="vt-chat-layout__resizer"
          onMouseDown={startResize}
          role="separator"
          aria-label="Ajustar ancho de la lista de chats"
          aria-orientation="vertical"
        />
      ) : null}
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
