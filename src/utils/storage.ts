import type { Chat, GreenApiCredentials } from '../types/chat'

const STORAGE_KEY = 'green-api-chat-session-v1'

export interface StoredSession {
  credentials: GreenApiCredentials
  chats: Chat[]
  activeChatId: string | null
}

/**
 * Проверяет базовую форму сохранённой сессии без доверия к данным браузера.
 * @param value Непроверенное значение из `sessionStorage`.
 * @returns `true`, если сессию можно безопасно восстановить.
 */
function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  const credentials = candidate.credentials
  return (
    typeof credentials === 'object' &&
    credentials !== null &&
    typeof (credentials as Record<string, unknown>).idInstance === 'string' &&
    typeof (credentials as Record<string, unknown>).apiTokenInstance === 'string' &&
    Array.isArray(candidate.chats) &&
    (typeof candidate.activeChatId === 'string' || candidate.activeChatId === null)
  )
}

/**
 * Загружает сессию из хранилища текущей вкладки.
 * @returns Сохранённая сессия или `null`, если данных нет либо они повреждены.
 */
export function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    return isStoredSession(value) ? value : null
  } catch {
    return null
  }
}

/**
 * Сохраняет состояние чатов и реквизиты в пределах текущей вкладки.
 * @param session Данные активной сессии.
 */
export function saveSession(session: StoredSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Приватный режим или политика браузера могут запрещать хранилище.
  }
}

/** Очищает сохранённую сессию и реквизиты GREEN-API. */
export function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Выход из интерфейса не должен зависеть от доступности хранилища.
  }
}
