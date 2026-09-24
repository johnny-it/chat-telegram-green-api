export interface GreenApiCredentials {
  idInstance: string
  apiTokenInstance: string
}

export interface InstanceStateResponse {
  stateInstance: string
}

export interface SendMessageRequest {
  chatId: string
  message: string
}

export interface SendMessageResponse {
  idMessage: string
}

export type MessageStatus = 'pending' | 'sent' | 'failed'

export interface ChatMessage {
  id: string
  serverId?: string
  chatId: string
  direction: 'incoming' | 'outgoing'
  text: string
  timestamp: number
  status: MessageStatus
}

export interface Chat {
  id: string
  phone: string
  displayPhone: string
  messages: ChatMessage[]
  unreadCount: number
}

export interface NotificationSenderData {
  chatId?: string
  chatType?: string
  sender?: string
  senderName?: string
  senderContactName?: string
  senderPhoneNumber?: number | string
}

export interface NotificationMessageData {
  typeMessage?: string
  textMessageData?: {
    textMessage?: string
  }
}

export interface GreenApiNotificationBody {
  typeWebhook?: string
  idMessage?: string
  timestamp?: number
  senderData?: NotificationSenderData
  messageData?: NotificationMessageData
}

export interface GreenApiNotification {
  receiptId: number
  body: GreenApiNotificationBody
}

export interface IncomingTextMessage {
  id: string
  chatId: string
  phone: string
  text: string
  timestamp: number
}
