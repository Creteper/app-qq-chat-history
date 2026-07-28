export type AvatarMode = "qq" | "custom"

export type MessageDirection = "incoming" | "outgoing"

export interface Contact {
  /** Stable application identifier. This must not change when profile fields change. */
  id: string
  /** QQ numbers are strings so large values and leading zeroes are preserved. */
  qq: string
  name: string
  avatarMode: AvatarMode
  /** Used when avatarMode is "custom"; kept as an empty string for QQ avatars. */
  customAvatarUrl: string
  lastMessage: string
  timeLabel: string
  muted: boolean
  unreadCount: number
  online: boolean
}

interface MessageBase {
  id: string
  type: "text" | "image" | "date" | "recall" | "system"
  /** Optional detailed time, useful for a bubble tooltip or accessibility label. */
  time?: string
}

export interface TextMessage extends MessageBase {
  type: "text"
  direction: MessageDirection
  content: string
}

export interface ImageMessage extends MessageBase {
  type: "image"
  direction: MessageDirection
  src: string
  alt: string
  caption?: string
  width?: number
  height?: number
}

export interface DateMessage extends MessageBase {
  type: "date"
  content: string
}

export interface RecallMessage extends MessageBase {
  type: "recall"
  content: string
  /** Present when the notice refers to one side of the conversation. */
  direction?: MessageDirection
}

export interface SystemMessage extends MessageBase {
  type: "system"
  content: string
  /** Optional clickable-looking lead text, such as QQ's custom recall prompt. */
  actionLabel?: string
}

export type Message =
  | TextMessage
  | ImageMessage
  | DateMessage
  | RecallMessage
  | SystemMessage

export type MessagesByContact = Record<Contact["id"], Message[]>

export type ContactPatch = Partial<Omit<Contact, "id">>
