import { useCallback, useEffect, useState } from "react"

import { defaultMessages } from "@/data/chat-data"
import type { Message, MessagesByContact } from "@/types/chat"

export const MESSAGES_STORAGE_KEY = "fake-qq.messages.v1"

export interface MessageStore {
  messages: MessagesByContact
  addMessage: (contactId: string, message: Message) => void
  updateMessage: (
    contactId: string,
    messageId: Message["id"],
    nextMessage: Message,
  ) => void
  deleteMessage: (contactId: string, messageId: Message["id"]) => void
  resetMessages: () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isDirection(value: unknown) {
  return value === "incoming" || value === "outgoing"
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string"
}

function isOptionalFiniteNumber(value: unknown) {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isFinite(value))
  )
}

function isMessage(value: unknown): value is Message {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isOptionalString(value.time)
  ) {
    return false
  }

  switch (value.type) {
    case "text":
      return isDirection(value.direction) && typeof value.content === "string"
    case "image":
      return (
        isDirection(value.direction) &&
        typeof value.src === "string" &&
        typeof value.alt === "string" &&
        isOptionalString(value.caption) &&
        isOptionalFiniteNumber(value.width) &&
        isOptionalFiniteNumber(value.height)
      )
    case "date":
      return typeof value.content === "string"
    case "recall":
      return (
        typeof value.content === "string" &&
        (value.direction === undefined || isDirection(value.direction))
      )
    case "system":
      return (
        typeof value.content === "string" &&
        isOptionalString(value.actionLabel)
      )
    default:
      return false
  }
}

function cloneMessage(message: Message): Message {
  switch (message.type) {
    case "text":
      return { ...message }
    case "image":
      return { ...message }
    case "date":
      return { ...message }
    case "recall":
      return { ...message }
    case "system":
      return { ...message }
  }
}

function cloneMessages(source: MessagesByContact): MessagesByContact {
  return Object.fromEntries(
    Object.entries(source).map(([contactId, messages]) => [
      contactId,
      messages.map(cloneMessage),
    ]),
  )
}

function cloneDefaultMessages(): MessagesByContact {
  return cloneMessages(defaultMessages)
}

function parseMessageList(value: unknown): Message[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const parsedMessages: Message[] = []
  const seenIds = new Set<string>()

  for (const candidate of value) {
    if (!isMessage(candidate) || seenIds.has(candidate.id)) {
      return null
    }

    seenIds.add(candidate.id)
    parsedMessages.push(cloneMessage(candidate))
  }

  return parsedMessages
}

function loadMessages(): MessagesByContact {
  const fallback = cloneDefaultMessages()

  if (typeof window === "undefined") {
    return fallback
  }

  try {
    const serialized = window.localStorage.getItem(MESSAGES_STORAGE_KEY)

    if (!serialized) {
      return fallback
    }

    const parsed: unknown = JSON.parse(serialized)

    if (!isRecord(parsed)) {
      return fallback
    }

    const hydrated = fallback

    for (const [contactId, value] of Object.entries(parsed)) {
      const messageList = parseMessageList(value)

      if (messageList) {
        hydrated[contactId] = messageList
      }
    }

    return hydrated
  } catch {
    return fallback
  }
}

function persistMessages(messages: MessagesByContact) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(
      MESSAGES_STORAGE_KEY,
      JSON.stringify(messages),
    )
  } catch {
    // Storage may be disabled, full, or unavailable in a privacy context.
  }
}

export function useMessageStore(): MessageStore {
  const [messages, setMessages] = useState<MessagesByContact>(loadMessages)

  useEffect(() => {
    persistMessages(messages)
  }, [messages])

  const addMessage = useCallback((contactId: string, message: Message) => {
    const nextMessage = cloneMessage(message)

    setMessages((currentMessages) => ({
      ...currentMessages,
      [contactId]: [
        ...(currentMessages[contactId] ?? []),
        nextMessage,
      ],
    }))
  }, [])

  const updateMessage = useCallback(
    (
      contactId: string,
      messageId: Message["id"],
      nextMessage: Message,
    ) => {
      const replacement = cloneMessage(nextMessage)

      setMessages((currentMessages) => {
        const contactMessages = currentMessages[contactId]

        if (
          !contactMessages ||
          !contactMessages.some((message) => message.id === messageId)
        ) {
          return currentMessages
        }

        return {
          ...currentMessages,
          [contactId]: contactMessages.map((message) =>
            message.id === messageId ? replacement : message,
          ),
        }
      })
    },
    [],
  )

  const deleteMessage = useCallback(
    (contactId: string, messageId: Message["id"]) => {
      setMessages((currentMessages) => {
        const contactMessages = currentMessages[contactId]

        if (
          !contactMessages ||
          !contactMessages.some((message) => message.id === messageId)
        ) {
          return currentMessages
        }

        return {
          ...currentMessages,
          [contactId]: contactMessages.filter(
            (message) => message.id !== messageId,
          ),
        }
      })
    },
    [],
  )

  const resetMessages = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(MESSAGES_STORAGE_KEY)
      } catch {
        // The in-memory reset still succeeds if storage is unavailable.
      }
    }

    setMessages(cloneDefaultMessages())
  }, [])

  return {
    messages,
    addMessage,
    updateMessage,
    deleteMessage,
    resetMessages,
  }
}
