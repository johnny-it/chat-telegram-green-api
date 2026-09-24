import type {
  GreenApiCredentials,
  GreenApiNotification,
  GreenApiNotificationBody,
  InstanceStateResponse,
  SendMessageRequest,
  SendMessageResponse,
} from '../types/chat'

const API_BASE_URL = 'https://api.green-api.com'

export class GreenApiError extends Error {
  readonly status: number | undefined

  /**
   * Создаёт ошибку запроса к GREEN-API.
   * @param message Понятное пользователю описание ошибки.
   * @param status HTTP-статус ответа, если сервер успел его вернуть.
   */
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GreenApiError'
    this.status = status
  }
}

/**
 * Проверяет, что значение является объектом с ключами.
 * @param value Непроверенное значение.
 * @returns `true`, если значение можно безопасно читать как объект.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Проверяет ответ метода состояния инстанса.
 * @param value Непроверенный JSON от API.
 * @returns `true`, если ответ содержит строковое состояние.
 */
function isInstanceStateResponse(value: unknown): value is InstanceStateResponse {
  return isRecord(value) && typeof value.stateInstance === 'string'
}

/**
 * Проверяет ответ отправки сообщения.
 * @param value Непроверенный JSON от API.
 * @returns `true`, если API вернул идентификатор сообщения.
 */
function isSendMessageResponse(value: unknown): value is SendMessageResponse {
  return isRecord(value) && typeof value.idMessage === 'string'
}

/**
 * Безопасно преобразует тело уведомления в поддерживаемую структуру.
 * @param value Непроверенное тело уведомления.
 * @returns Типизированное тело с известными полями.
 */
function parseNotificationBody(value: unknown): GreenApiNotificationBody {
  if (!isRecord(value)) return {}

  const senderData = isRecord(value.senderData)
    ? {
        ...(typeof value.senderData.chatId === 'string' ? { chatId: value.senderData.chatId } : {}),
        ...(typeof value.senderData.chatType === 'string'
          ? { chatType: value.senderData.chatType }
          : {}),
        ...(typeof value.senderData.sender === 'string' ? { sender: value.senderData.sender } : {}),
        ...(typeof value.senderData.senderName === 'string'
          ? { senderName: value.senderData.senderName }
          : {}),
        ...(typeof value.senderData.senderContactName === 'string'
          ? { senderContactName: value.senderData.senderContactName }
          : {}),
        ...(typeof value.senderData.senderPhoneNumber === 'number' ||
        typeof value.senderData.senderPhoneNumber === 'string'
          ? { senderPhoneNumber: value.senderData.senderPhoneNumber }
          : {}),
      }
    : undefined

  const rawMessageData = value.messageData
  const rawTextData = isRecord(rawMessageData) ? rawMessageData.textMessageData : undefined
  const messageData = isRecord(rawMessageData)
    ? {
        ...(typeof rawMessageData.typeMessage === 'string'
          ? { typeMessage: rawMessageData.typeMessage }
          : {}),
        ...(isRecord(rawTextData) && typeof rawTextData.textMessage === 'string'
          ? { textMessageData: { textMessage: rawTextData.textMessage } }
          : {}),
      }
    : undefined

  return {
    ...(typeof value.typeWebhook === 'string' ? { typeWebhook: value.typeWebhook } : {}),
    ...(typeof value.idMessage === 'string' ? { idMessage: value.idMessage } : {}),
    ...(typeof value.timestamp === 'number' ? { timestamp: value.timestamp } : {}),
    ...(senderData ? { senderData } : {}),
    ...(messageData ? { messageData } : {}),
  }
}

/**
 * Проверяет и преобразует уведомление GREEN-API.
 * @param value Непроверенный JSON от API.
 * @returns Уведомление или `null`, если ответ имеет неверную форму.
 */
function parseNotification(value: unknown): GreenApiNotification | null {
  if (!isRecord(value) || typeof value.receiptId !== 'number') return null
  return { receiptId: value.receiptId, body: parseNotificationBody(value.body) }
}

/**
 * Формирует URL метода GREEN-API.
 * @param credentials Реквизиты инстанса.
 * @param method Название вызываемого метода.
 * @returns Полный адрес запроса.
 */
function buildUrl(credentials: GreenApiCredentials, method: string): string {
  return `${API_BASE_URL}/waInstance${encodeURIComponent(credentials.idInstance)}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}`
}

/**
 * Читает JSON и преобразует сетевые ошибки в понятный формат.
 * @param response Ответ браузерного Fetch API.
 * @returns Непроверенное содержимое JSON.
 * @throws {GreenApiError} Если сервер вернул ошибку или некорректный JSON.
 */
async function readJson(response: Response): Promise<unknown> {
  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new GreenApiError('GREEN-API вернул некорректный ответ.', response.status)
  }

  if (!response.ok) {
    const description =
      isRecord(data) && typeof data.description === 'string'
        ? data.description
        : `Ошибка GREEN-API (${response.status}).`
    throw new GreenApiError(description, response.status)
  }

  return data
}

/**
 * Получает текущее состояние инстанса.
 * @param credentials ID и токен инстанса.
 * @returns Состояние авторизации инстанса.
 * @throws {GreenApiError} Если реквизиты неверны или ответ не соответствует контракту.
 */
export async function getInstanceState(
  credentials: GreenApiCredentials,
): Promise<InstanceStateResponse> {
  const response = await fetch(buildUrl(credentials, 'getStateInstance'))
  const data = await readJson(response)
  if (!isInstanceStateResponse(data)) {
    throw new GreenApiError('Не удалось определить состояние инстанса.')
  }
  return data
}

/**
 * Отправляет текстовое сообщение в Telegram.
 * @param credentials ID и токен инстанса.
 * @param chatId Идентификатор личного чата в формате `<номер>@c.us`.
 * @param message Текст длиной до 4096 символов.
 * @returns Идентификатор сообщения, присвоенный GREEN-API.
 * @throws {GreenApiError} Если сообщение не принято API.
 */
export async function sendMessage(
  credentials: GreenApiCredentials,
  chatId: string,
  message: string,
): Promise<SendMessageResponse> {
  const payload: SendMessageRequest = { chatId, message }
  const response = await fetch(buildUrl(credentials, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson(response)
  if (!isSendMessageResponse(data)) {
    throw new GreenApiError('GREEN-API не вернул идентификатор сообщения.')
  }
  return data
}

/**
 * Получает следующее уведомление из очереди инстанса.
 * @param credentials ID и токен инстанса.
 * @param signal Сигнал отмены long polling запроса.
 * @returns Следующее уведомление либо `null`, если очередь пуста.
 * @throws {GreenApiError} Если API вернул ошибку или неизвестную структуру уведомления.
 */
export async function receiveNotification(
  credentials: GreenApiCredentials,
  signal: AbortSignal,
): Promise<GreenApiNotification | null> {
  const response = await fetch(`${buildUrl(credentials, 'receiveNotification')}?receiveTimeout=10`, {
    signal,
  })
  const data = await readJson(response)
  if (data === null) return null

  const notification = parseNotification(data)
  if (!notification) {
    throw new GreenApiError('Получено уведомление неизвестного формата.')
  }
  return notification
}

/**
 * Подтверждает обработку уведомления и удаляет его из очереди.
 * @param credentials ID и токен инстанса.
 * @param receiptId Идентификатор полученного уведомления.
 * @param signal Сигнал отмены запроса.
 * @returns `true`, если API подтвердил удаление.
 * @throws {GreenApiError} Если уведомление не удалось удалить.
 */
export async function deleteNotification(
  credentials: GreenApiCredentials,
  receiptId: number,
  signal: AbortSignal,
): Promise<boolean> {
  const response = await fetch(`${buildUrl(credentials, 'deleteNotification')}/${receiptId}`, {
    method: 'DELETE',
    signal,
  })
  const data = await readJson(response)
  if (!isRecord(data) || data.result !== true) {
    throw new GreenApiError('Не удалось подтвердить обработку уведомления.')
  }
  return true
}
