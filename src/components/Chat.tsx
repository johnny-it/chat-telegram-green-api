import { useState } from 'react'
import type { ChatSessionController } from '../hooks/useChatSession'
import { ChatSidebar } from './ChatSidebar'
import { Conversation } from './Conversation'
import { NewChatModal } from './NewChatModal'
import styles from './Chat.module.css'

interface ChatProps {
  controller: ChatSessionController
}

/**
 * Компонует адаптивную панель чатов и активный диалог.
 * @param props Контроллер состояния сессии.
 * @returns Основной интерфейс подключённого приложения.
 */
export function Chat({ controller }: ChatProps) {
  const [search, setSearch] = useState('')
  const [isModalOpen, setModalOpen] = useState(false)
  const { state, activeChat } = controller

  /**
   * Создаёт чат и закрывает модальную форму.
   * @param phone Номер телефона из формы.
   */
  function handleCreateChat(phone: string): void {
    controller.createChat(phone)
    setModalOpen(false)
  }

  return (
    <div className={`${styles.app} ${state.mobileView === 'chat' ? styles.mobileChatOpen : styles.mobileListOpen}`}>
      <ChatSidebar
        chats={state.chats}
        activeChatId={state.activeChatId}
        search={search}
        onSearch={setSearch}
        onNewChat={() => setModalOpen(true)}
        onSelectChat={controller.selectChat}
        onLogout={controller.logout}
      />
      <Conversation
        key={activeChat?.id ?? 'empty'}
        chat={activeChat}
        syncError={state.syncError}
        onBack={controller.showChatList}
        onSend={controller.sendMessage}
        onRetry={controller.retryMessage}
      />
      {isModalOpen ? (
        <NewChatModal onClose={() => setModalOpen(false)} onCreate={handleCreateChat} />
      ) : null}
    </div>
  )
}
