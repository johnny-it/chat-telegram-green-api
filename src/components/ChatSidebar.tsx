import { useMemo } from 'react'
import type { Chat } from '../types/chat'
import { BrandMark, Icon } from './Icons'
import styles from './Chat.module.css'

interface ChatSidebarProps {
  chats: Chat[]
  activeChatId: string | null
  search: string
  onSearch: (value: string) => void
  onNewChat: () => void
  onSelectChat: (chatId: string) => void
  onLogout: () => void
}

/**
 * Возвращает текст последнего сообщения для списка чатов.
 * @param chat Чат с историей текущей сессии.
 * @returns Последнее сообщение или подсказка для пустого чата.
 */
function getChatPreview(chat: Chat): string {
  return chat.messages.at(-1)?.text ?? 'Новый чат'
}

/**
 * Отображает панель навигации по чатам.
 * @param props Чаты, поисковый запрос и обработчики действий панели.
 * @returns Панель со списком диалогов.
 */
export function ChatSidebar({
  chats,
  activeChatId,
  search,
  onSearch,
  onNewChat,
  onSelectChat,
  onLogout,
}: ChatSidebarProps) {
  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return chats
    return chats.filter(
      (chat) =>
        chat.displayPhone.toLowerCase().includes(query) ||
        getChatPreview(chat).toLowerCase().includes(query),
    )
  }, [chats, search])

  return (
    <aside className={styles.sidebar} aria-label="Список чатов">
      <header className={styles.sidebarHeader}>
        <div className={styles.brand}>
          <BrandMark />
          <span>Чат</span>
        </div>
        <button type="button" className={styles.iconButton} onClick={onLogout} aria-label="Выйти">
          <Icon name="logout" />
        </button>
      </header>

      <div className={styles.sidebarTools}>
        <button type="button" className={styles.newChatButton} onClick={onNewChat}>
          <Icon name="plus" />
          Новый чат
        </button>
        <label className={styles.searchField}>
          <Icon name="search" />
          <input
            type="search"
            placeholder="Поиск"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            aria-label="Поиск по чатам"
          />
        </label>
      </div>

      <div className={styles.chatList}>
        {filteredChats.length ? (
          filteredChats.map((chat) => (
            <button
              type="button"
              key={chat.id}
              className={`${styles.chatRow} ${chat.id === activeChatId ? styles.chatRowActive : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <span className={styles.avatar}>
                <Icon name="user" />
              </span>
              <span className={styles.chatRowText}>
                <span className={styles.chatRowTitle}>{chat.displayPhone}</span>
                <span className={styles.chatPreview}>{getChatPreview(chat)}</span>
              </span>
              {chat.unreadCount > 0 ? (
                <span className={styles.unreadCount}>{chat.unreadCount}</span>
              ) : null}
            </button>
          ))
        ) : (
          <div className={styles.sidebarEmpty}>
            <Icon name="message" />
            <p>{search ? 'Ничего не найдено' : 'Создайте первый чат'}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
