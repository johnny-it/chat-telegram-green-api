import { useCallback, useEffect, useMemo, useReducer } from 'react'
import {
  deleteNotification,
  getInstanceState,
  GreenApiError,
  receiveNotification,
  sendMessage as sendGreenApiMessage,
} from '../api/greenApi'
import type {
  Chat,
  ChatMessage,
  GreenApiCredentials,
  GreenApiNotification,
  IncomingTextMessage,
} from '../types/chat'
import { chatIdToPhone, formatPhone, normalizePhone, phoneToChatId } from '../utils/phone'
import { clearSession, loadSession, saveSession } from '../utils/storage'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'
type MobileView = 'list' | 'chat'

interface ChatSessionState {
  credentials: GreenApiCredentials | null
  chats: Chat[]
  activeChatId: string | null
  connectionStatus: ConnectionStatus
  connectionError: string | null
  syncError: string | null
  mobileView: MobileView
}

type ChatSessionAction =
  | { type: 'CONNECT_START' }
  | { type: 'CONNECT_SUCCESS'; credentials: GreenApiCredentials }
  | { type: 'CONNECT_FAILURE'; message: string }
  | { type: 'LOGOUT' }
  | { type: 'CREATE_CHAT'; chat: Chat }
  | { type: 'SELECT_CHAT'; chatId: string }
  | { type: 'SHOW_CHAT_LIST' }
  | { type: 'ADD_OUTGOING'; message: ChatMessage }
  | { type: 'MARK_SENT'; localId: string; serverId: string }
  | { type: 'MARK_FAILED'; localId: string }
  | { type: 'MARK_PENDING'; localId: string }
  | { type: 'RECEIVE_MESSAGE'; message: IncomingTextMessage }
  | { type: 'SYNC_ERROR'; message: string | null }

export interface ChatSessionController {
  state: ChatSessionState
  activeChat: Chat | null
  connect: (credentials: GreenApiCredentials) => Promise<void>
  logout: () => void
  createChat: (phoneInput: string) => string
  selectChat: (chatId: string) => void
  showChatList: () => void
  sendMessage: (text: string) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
}

/**
 * Восстанавливает начальное состояние из текущей вкладки браузера.
 * @returns Состояние приложения с сохранённой сессией или экраном подключения.
 */
function createInitialState(): ChatSessionState {
  const stored = loadSession()
  if (!stored) {
    return {
      credentials: null,
      chats: [],
      activeChatId: null,
      connectionStatus: 'disconnected',
      connectionError: null,
      syncError: null,
      mobileView: 'list',
    }
  }

  return {
    credentials: stored.credentials,
    chats: stored.chats,
    activeChatId: stored.activeChatId,
    connectionStatus: 'connected',
    connectionError: null,
    syncError: null,
    mobileView: stored.activeChatId ? 'chat' : 'list',
  }
}

/**
 * Обновляет конкретное сообщение во всех чатах.
 * @param chats Текущий список чатов.
 * @param messageId Локальный идентификатор сообщения.
 * @param updater Функция изменения найденного сообщения.
 * @returns Новый список чатов с обновлённым сообщением.
 */
function updateMessage(
  chats: Chat[],
  messageId: string,
  updater: (message: ChatMessage) => ChatMessage,
): Chat[] {
  return chats.map((chat) => ({
    ...chat,
    messages: chat.messages.map((message) =>
      message.id === messageId ? updater(message) : message,
    ),
  }))
}

/**
 * Управляет всеми переходами состояния сессии и чатов.
 * @param state Текущее состояние приложения.
 * @param action Событие пользовательского интерфейса или API.
 * @returns Следующее неизменяемое состояние.
 */
function chatSessionReducer(
  state: ChatSessionState,
  action: ChatSessionAction,
): ChatSessionState {
  switch (action.type) {
    case 'CONNECT_START':
      return { ...state, connectionStatus: 'connecting', connectionError: null }
    case 'CONNECT_SUCCESS':
      return {
        ...state,
        credentials: action.credentials,
        connectionStatus: 'connected',
        connectionError: null,
      }
    case 'CONNECT_FAILURE':
      return {
        ...state,
        credentials: null,
        connectionStatus: 'disconnected',
        connectionError: action.message,
      }
    case 'LOGOUT':
      return createInitialState()
    case 'CREATE_CHAT': {
      const exists = state.chats.some((chat) => chat.id === action.chat.id)
      return {
        ...state,
        chats: exists ? state.chats : [action.chat, ...state.chats],
        activeChatId: action.chat.id,
        mobileView: 'chat',
      }
    }
    case 'SELECT_CHAT':
      return {
        ...state,
        activeChatId: action.chatId,
        mobileView: 'chat',
        chats: state.chats.map((chat) =>
          chat.id === action.chatId ? { ...chat, unreadCount: 0 } : chat,
        ),
      }
    case 'SHOW_CHAT_LIST':
      return { ...state, mobileView: 'list' }
    case 'ADD_OUTGOING':
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.id === action.message.chatId
            ? { ...chat, messages: [...chat.messages, action.message] }
            : chat,
        ),
      }
    case 'MARK_SENT':
      return {
        ...state,
        chats: updateMessage(state.chats, action.localId, (message) => ({
          ...message,
          serverId: action.serverId,
          status: 'sent',
        })),
      }
    case 'MARK_FAILED':
      return {
        ...state,
        chats: updateMessage(state.chats, action.localId, (message) => ({
          ...message,
          status: 'failed',
        })),
      }
    case 'MARK_PENDING':
      return {
        ...state,
        chats: updateMessage(state.chats, action.localId, (message) => ({
          ...message,
          status: 'pending',
        })),
      }
    case 'RECEIVE_MESSAGE': {
      const existingChat = state.chats.find((chat) => chat.id === action.message.chatId)
      if (existingChat?.messages.some((message) => message.id === action.message.id)) return state

      const incoming: ChatMessage = {
        id: action.message.id,
        serverId: action.message.id,
        chatId: action.message.chatId,
        direction: 'incoming',
        text: action.message.text,
        timestamp: action.message.timestamp,
        status: 'sent',
      }

      if (!existingChat) {
        const chat: Chat = {
          id: action.message.chatId,
          phone: action.message.phone,
          displayPhone: formatPhone(action.message.phone),
          messages: [incoming],
          unreadCount: state.activeChatId === action.message.chatId ? 0 : 1,
        }
        return { ...state, chats: [chat, ...state.chats] }
      }

      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.id === action.message.chatId
            ? {
                ...chat,
                messages: [...chat.messages, incoming],
                unreadCount:
                  state.activeChatId === action.message.chatId ? 0 : chat.unreadCount + 1,
              }
            : chat,
        ),
      }
    }
    case 'SYNC_ERROR':
      return { ...state, syncError: action.message }
  }
}

/**
 * Преобразует входящее уведомление в текстовое сообщение приложения.
 * @param notification Уведомление из очереди GREEN-API.
 * @returns Текстовое сообщение либо `null` для статусов, медиа и других событий.
 */
function extractIncomingText(
  notification: GreenApiNotification,
): IncomingTextMessage | null {
  const { body } = notification
  if (body.typeWebhook !== 'incomingMessageReceived') return null
  if (body.messageData?.typeMessage !== 'textMessage') return null
  if (body.senderData?.chatType && body.senderData.chatType !== 'user') return null

  const text = body.messageData.textMessageData?.textMessage
  const sender = body.senderData?.senderPhoneNumber ?? body.senderData?.chatId ?? body.senderData?.sender
  if (!text || sender === undefined) return null

  const phone = chatIdToPhone(String(sender))
  if (!/^\d{7,15}$/.test(phone)) return null

  return {
    id: body.idMessage ?? `incoming-${notification.receiptId}`,
    chatId: phoneToChatId(phone),
    phone,
    text,
    timestamp: body.timestamp ? body.timestamp * 1000 : Date.now(),
  }
}

/**
 * Приостанавливает повторный запрос и поддерживает немедленную отмену.
 * @param milliseconds Продолжительность задержки.
 * @param signal Сигнал отмены активной сессии.
 * @returns Promise, завершающийся после задержки или отмены.
 */
function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, milliseconds)
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer)
      resolve()
    }, { once: true })
  })
}

/**
 * Преобразует техническую ошибку подключения в русское сообщение.
 * @param error Неизвестная ошибка запроса.
 * @returns Сообщение для интерфейса.
 */
function getConnectionError(error: unknown): string {
  if (error instanceof GreenApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Проверьте ID и токен инстанса.'
    }
    return error.message
  }
  return 'Не удалось подключиться к GREEN-API. Проверьте интернет-соединение.'
}

/**
 * Предоставляет состояние и действия клиентского Telegram-чата.
 * @returns Контроллер подключения, чатов, отправки и long polling.
 */
export function useChatSession(): ChatSessionController {
  const [state, dispatch] = useReducer(chatSessionReducer, undefined, createInitialState)

  useEffect(() => {
    if (!state.credentials) return
    saveSession({
      credentials: state.credentials,
      chats: state.chats,
      activeChatId: state.activeChatId,
    })
  }, [state.activeChatId, state.chats, state.credentials])

  useEffect(() => {
    if (!state.credentials) return

    const credentials = state.credentials
    const controller = new AbortController()

    /** Последовательно читает очередь уведомлений до завершения сессии. */
    async function poll(): Promise<void> {
      while (!controller.signal.aborted) {
        try {
          const notification = await receiveNotification(credentials, controller.signal)
          if (!notification) continue

          const incoming = extractIncomingText(notification)
          if (incoming) dispatch({ type: 'RECEIVE_MESSAGE', message: incoming })
          await deleteNotification(credentials, notification.receiptId, controller.signal)
          dispatch({ type: 'SYNC_ERROR', message: null })
        } catch (error: unknown) {
          if (controller.signal.aborted) return
          dispatch({ type: 'SYNC_ERROR', message: getConnectionError(error) })
          await wait(2000, controller.signal)
        }
      }
    }

    void poll()
    return () => controller.abort()
  }, [state.credentials])

  const activeChat = useMemo(
    () => state.chats.find((chat) => chat.id === state.activeChatId) ?? null,
    [state.activeChatId, state.chats],
  )

  const connect = useCallback(async (credentials: GreenApiCredentials): Promise<void> => {
    dispatch({ type: 'CONNECT_START' })
    try {
      const result = await getInstanceState(credentials)
      if (result.stateInstance !== 'authorized') {
        dispatch({
          type: 'CONNECT_FAILURE',
          message: 'Инстанс не авторизован. Авторизуйте его в личном кабинете GREEN-API.',
        })
        return
      }
      dispatch({ type: 'CONNECT_SUCCESS', credentials })
    } catch (error: unknown) {
      dispatch({ type: 'CONNECT_FAILURE', message: getConnectionError(error) })
    }
  }, [])

  const logout = useCallback((): void => {
    clearSession()
    dispatch({ type: 'LOGOUT' })
  }, [])

  const createChat = useCallback((phoneInput: string): string => {
    const phone = normalizePhone(phoneInput)
    const chatId = phoneToChatId(phone)
    dispatch({
      type: 'CREATE_CHAT',
      chat: {
        id: chatId,
        phone,
        displayPhone: formatPhone(phone),
        messages: [],
        unreadCount: 0,
      },
    })
    return chatId
  }, [])

  const selectChat = useCallback((chatId: string): void => {
    dispatch({ type: 'SELECT_CHAT', chatId })
  }, [])

  const showChatList = useCallback((): void => {
    dispatch({ type: 'SHOW_CHAT_LIST' })
  }, [])

  const deliverMessage = useCallback(
    async (message: ChatMessage): Promise<void> => {
      if (!state.credentials) return
      try {
        const response = await sendGreenApiMessage(
          state.credentials,
          message.chatId,
          message.text,
        )
        dispatch({ type: 'MARK_SENT', localId: message.id, serverId: response.idMessage })
      } catch {
        dispatch({ type: 'MARK_FAILED', localId: message.id })
      }
    },
    [state.credentials],
  )

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!activeChat || !state.credentials) return
      const trimmed = text.trim()
      if (!trimmed || trimmed.length > 4096) return

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        chatId: activeChat.id,
        direction: 'outgoing',
        text: trimmed,
        timestamp: Date.now(),
        status: 'pending',
      }
      dispatch({ type: 'ADD_OUTGOING', message })
      await deliverMessage(message)
    },
    [activeChat, deliverMessage, state.credentials],
  )

  const retryMessage = useCallback(
    async (messageId: string): Promise<void> => {
      const message = state.chats
        .flatMap((chat) => chat.messages)
        .find((item) => item.id === messageId && item.status === 'failed')
      if (!message) return

      dispatch({ type: 'MARK_PENDING', localId: message.id })
      await deliverMessage(message)
    },
    [deliverMessage, state.chats],
  )

  return {
    state,
    activeChat,
    connect,
    logout,
    createChat,
    selectChat,
    showChatList,
    sendMessage,
    retryMessage,
  }
}
