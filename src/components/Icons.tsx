import type { SVGProps } from 'react'

export type IconName =
  | 'arrow-left'
  | 'check'
  | 'eye'
  | 'eye-off'
  | 'logout'
  | 'message'
  | 'more'
  | 'plus'
  | 'search'
  | 'send'
  | 'user'
  | 'warning'
  | 'x'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
}

/**
 * Отрисовывает иконку из единого набора с закруглёнными линиями.
 * @param props Имя и стандартные SVG-атрибуты иконки.
 * @returns Масштабируемая декоративная SVG-иконка.
 */
export function Icon({ name, ...props }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    'arrow-left': <path d="m15 18-6-6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    'eye-off': (
      <>
        <path d="m3 3 18 18M10.7 6.2A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.3 3M6.1 6.1C3.8 7.7 2.5 12 2.5 12s3.5 6 9.5 6a10 10 0 0 0 3.1-.5" />
        <path d="M10.2 10.2a2.6 2.6 0 0 0 3.6 3.6" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
        <path d="m15 16 4-4-4-4M19 12H9" />
      </>
    ),
    message: <path d="M20 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v8Z" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: <path d="m20 20-4.4-4.4M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />,
    send: <path d="m21 3-7.1 18-3.4-7.5L3 10.1 21 3ZM10.5 13.5 21 3" />,
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    warning: (
      <>
        <path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}

/**
 * Отрисовывает оригинальный знак приложения без использования брендов мессенджеров.
 * @param props Стандартные SVG-атрибуты.
 * @returns Синий знак диалога.
 */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M20 3.5c9.1 0 16.5 6.6 16.5 14.8S29.1 33.1 20 33.1c-1.8 0-3.5-.2-5.1-.7L7.3 36a1.2 1.2 0 0 1-1.7-1.3l1.6-7.1a13.7 13.7 0 0 1-3.7-9.3C3.5 10.1 10.9 3.5 20 3.5Z"
      />
      <circle cx="20" cy="18.3" r="5.1" fill="white" />
    </svg>
  )
}
