import { useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react'
import type { Chat, ChatMessage } from '../types/chat'
import { Icon } from './Icons'
import styles from './Chat.module.css'

interface ConversationProps {
  chat: Chat | null
  syncError: string | null
  onBack: () => void
  onSend: (text: string) => Promise<void>
  onRetry: (messageId: string) => Promise<void>
}

interface MessageMetaProps {
  message: ChatMessage
  onRetry: (messageId: string) => Promise<void>
}

/**
 * Форматирует время сообщения с учётом локали браузера.
 * @param timestamp Время сообщения в миллисекундах.
 * @returns Строка времени в формате часы:минуты.
 */
function formatMessageTime(timestamp: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

/**
 * Показывает статус исходящего сообщения.
 * @param props Сообщение и обработчик повторной отправки.
 * @returns Подпись времени и состояние доставки.
 */
function MessageMeta({ message, onRetry }: MessageMetaProps) {
  if (message.direction === 'incoming') {
    return <span className={styles.messageMeta}>{formatMessageTime(message.timestamp)}</span>
  }

  return (
    <span className={styles.messageMeta}>
      {formatMessageTime(message.timestamp)}
      {message.status === 'pending' ? (
        <span className={styles.pendingDot} aria-label="Отправляется" />
      ) : null}
      {message.status === 'sent' ? <Icon name="check" aria-label="Отправлено" /> : null}
      {message.status === 'failed' ? (
        <button
          type="button"
          className={styles.retryButton}
          onClick={() => void onRetry(message.id)}
        >
          Повторить
        </button>
      ) : null}
    </span>
  )
}

/**
 * Отображает активный диалог и форму отправки сообщения.
 * @param props Активный чат, состояние синхронизации и действия диалога.
 * @returns Область переписки либо пустое состояние.
 */
export function Conversation({ chat, syncError, onBack, onSend, onRetry }: ConversationProps) {
  const [draft, setDraft] = useState('')
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat?.messages])

  /**
   * Отправляет текст и очищает поле редактора.
   * @param event Событие отправки формы.
   */
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    const message = draft.trim()
    if (!message || message.length > 4096) return
    setDraft('')
    void onSend(message)
  }

  /**
   * Отправляет сообщение по Enter, сохраняя Shift+Enter для новой строки.
   * @param event Событие клавиатуры поля сообщения.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  if (!chat) {
    return (
      <main className={styles.emptyConversation}>
        <div className={styles.emptyIcon}>
          <Icon name="message" />
        </div>
        <h1>Выберите чат</h1>
        <p>Откройте диалог или создайте новый</p>
      </main>
    )
  }

  return (
    <main className={styles.conversation}>
      <header className={styles.conversationHeader}>
        <button
          type="button"
          className={styles.mobileBack}
          onClick={onBack}
          aria-label="К списку чатов"
        >
          <Icon name="arrow-left" />
        </button>
        <span className={styles.headerAvatar}>
          <Icon name="user" />
        </span>
        <div className={styles.conversationTitle}>
          <h1>{chat.displayPhone}</h1>
          <span>
            <i /> Telegram
          </span>
        </div>
        <span className={styles.moreButton} aria-hidden="true">
          <Icon name="more" />
        </span>
      </header>

      {syncError ? (
        <div className={styles.syncError} role="status">
          <Icon name="warning" />
          {syncError}
        </div>
      ) : null}

      <div className={styles.messages} aria-live="polite">
        <div className={styles.dayLabel}>Сегодня</div>
        {chat.messages.length ? (
          chat.messages.map((message) => (
            <article
              key={message.id}
              className={`${styles.message} ${message.direction === 'outgoing' ? styles.outgoing : styles.incoming} ${message.status === 'failed' ? styles.failed : ''}`}
            >
              <p>{message.text}</p>
              <MessageMeta message={message} onRetry={onRetry} />
            </article>
          ))
        ) : (
          <div className={styles.chatEmpty}>
            <div className={styles.emptyIcon}>
              <Icon name="message" />
            </div>
            <p>Напишите первое сообщение</p>
          </div>
        )}
        <div ref={listEndRef} />
      </div>

      <form className={styles.composer} onSubmit={handleSubmit}>
        <textarea
          rows={1}
          maxLength={4096}
          placeholder="Сообщение"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Текст сообщения"
        />
        <button type="submit" disabled={!draft.trim()} aria-label="Отправить сообщение">
          <Icon name="send" />
        </button>
      </form>
    </main>
  )
}
