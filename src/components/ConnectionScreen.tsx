import { useState, type SubmitEvent } from 'react'
import type { GreenApiCredentials } from '../types/chat'
import { BrandMark, Icon } from './Icons'
import styles from './ConnectionScreen.module.css'

interface ConnectionScreenProps {
  status: 'disconnected' | 'connecting' | 'connected'
  error: string | null
  onConnect: (credentials: GreenApiCredentials) => Promise<void>
}

/**
 * Показывает форму безопасного подключения к пользовательскому инстансу.
 * @param props Состояние подключения и обработчик проверки реквизитов.
 * @returns Экран ввода ID и токена GREEN-API.
 */
export function ConnectionScreen({ status, error, onConnect }: ConnectionScreenProps) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  /**
   * Проверяет и отправляет реквизиты на подключение.
   * @param event Событие отправки формы.
   */
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const id = idInstance.trim()
    const token = apiTokenInstance.trim()
    if (!/^\d+$/.test(id) || !token) {
      setValidationError('Введите числовой ID инстанса и токен доступа.')
      return
    }
    setValidationError(null)
    await onConnect({ idInstance: id, apiTokenInstance: token })
  }

  const displayedError = validationError ?? error

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="connection-title">
        <div className={styles.brand}>
          <BrandMark className={styles.logo} />
          <span>Чат</span>
        </div>

        <div className={styles.heading}>
          <h1 id="connection-title">Подключение к GREEN-API</h1>
          <p>Введите данные аккаунта, чтобы отправлять и получать сообщения в Telegram.</p>
        </div>

        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
          <label className={styles.field}>
            <span>ID инстанса</span>
            <input
              name="greenApiInstanceId"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Например, 4100000000"
              value={idInstance}
              onChange={(event) => setIdInstance(event.target.value)}
              aria-invalid={Boolean(displayedError)}
            />
          </label>

          <label className={styles.field}>
            <span>Токен инстанса</span>
            <div className={styles.passwordField}>
              <input
                name="greenApiToken"
                type={showToken ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Введите токен инстанса"
                value={apiTokenInstance}
                onChange={(event) => setApiTokenInstance(event.target.value)}
                aria-invalid={Boolean(displayedError)}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowToken((value) => !value)}
                aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
              >
                <Icon name={showToken ? 'eye-off' : 'eye'} />
              </button>
            </div>
          </label>

          {displayedError ? (
            <p className={styles.error} role="alert">
              <Icon name="warning" />
              {displayedError}
            </p>
          ) : null}

          <button className={styles.submit} type="submit" disabled={status === 'connecting'}>
            {status === 'connecting' ? <span className={styles.spinner} /> : null}
            {status === 'connecting' ? 'Подключение…' : 'Подключиться'}
          </button>
        </form>

        <p className={styles.privacy}>Данные используются только в текущей сессии</p>
      </section>
    </main>
  )
}
