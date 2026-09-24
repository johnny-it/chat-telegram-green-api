const PHONE_PATTERN = /^\d{7,15}$/

/**
 * Подготавливает значение поля телефона во время пользовательского ввода.
 * @param value Текущее значение поля, включая введённые или вставленные символы.
 * @returns Пустую строку, одиночный плюс или номер с ведущим плюсом и максимум 15 цифрами.
 */
export function sanitizePhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 15)
  if (digits.length > 0) return `+${digits}`
  return value.includes('+') ? '+' : ''
}

/**
 * Очищает номер телефона от допустимых символов форматирования.
 * @param value Номер в пользовательском формате.
 * @returns Только цифры номера без ведущего плюса.
 * @throws {Error} Если номер содержит буквы или имеет недопустимую длину.
 */
export function normalizePhone(value: string): string {
  const normalized = value.replace(/[\s()+-]/g, '')
  if (!PHONE_PATTERN.test(normalized)) {
    throw new Error('Введите номер в международном формате: от 7 до 15 цифр.')
  }
  return normalized
}

/**
 * Формирует идентификатор личного чата GREEN-API.
 * @param phone Нормализованный номер телефона.
 * @returns Идентификатор чата в формате `<номер>@c.us`.
 */
export function phoneToChatId(phone: string): string {
  return `${phone}@c.us`
}

/**
 * Извлекает номер телефона из идентификатора чата.
 * @param chatId Идентификатор чата или отправителя GREEN-API.
 * @returns Только цифры номера.
 */
export function chatIdToPhone(chatId: string): string {
  return chatId.replace(/@c\.us$/i, '').replace(/\D/g, '')
}

/**
 * Подготавливает компактное отображение международного номера.
 * @param phone Нормализованный номер телефона.
 * @returns Номер с ведущим плюсом и группировкой цифр.
 */
export function formatPhone(phone: string): string {
  if (phone.length === 11 && phone.startsWith('7')) {
    return `+${phone.slice(0, 1)} ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`
  }
  return `+${phone}`
}
