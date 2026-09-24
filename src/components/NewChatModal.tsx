import { useEffect, useState, type SubmitEvent } from 'react'
import { sanitizePhoneInput } from '../utils/phone'
import { Icon } from './Icons'
import styles from './Chat.module.css'

interface NewChatModalProps {
  onClose: () => void
  onCreate: (phone: string) => void
}

/**
 * Показывает компактную форму создания личного чата.
 * @param props Обработчики закрытия и создания чата.
 * @returns Модальное окно ввода международного номера.
 */
export function NewChatModal({ onClose, onCreate }: NewChatModalProps) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    /**
     * Закрывает окно по клавише Escape.
     * @param event Событие клавиатуры документа.
     */
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  /**
   * Передаёт проверенный номер в состояние чатов.
   * @param event Событие отправки формы.
   */
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    try {
      onCreate(phone)
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Не удалось создать чат.')
    }
  }

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id="new-chat-title">Новый чат</h2>
            <p>Введите номер получателя в Telegram</p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Закрыть">
            <Icon name="x" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className={styles.modalField}>
            <span>Номер телефона</span>
            <input
              autoFocus
              inputMode="tel"
              autoComplete="tel"
              maxLength={16}
              pattern="\+[0-9]{7,15}"
              placeholder="+79991234567"
              value={phone}
              onChange={(event) => {
                setPhone(sanitizePhoneInput(event.target.value))
                setError(null)
              }}
              aria-invalid={Boolean(error)}
            />
          </label>
          {error ? <p className={styles.modalError}>{error}</p> : null}
          <div className={styles.modalActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>Отмена</button>
            <button type="submit" className={styles.primaryButton}>Создать чат</button>
          </div>
        </form>
      </section>
    </div>
  )
}
