import { useCallback, useEffect, useState } from "react"

import { defaultContacts } from "@/data/chat-data"
import type { AvatarMode, Contact, ContactPatch } from "@/types/chat"

export const CONTACTS_STORAGE_KEY = "fake-qq.contacts.v1"

type ContactUpdater = ContactPatch | ((contact: Contact) => ContactPatch)

export interface ContactStore {
  contacts: Contact[]
  updateContact: (id: Contact["id"], update: ContactUpdater) => void
  resetContacts: () => void
}

function cloneDefaultContacts(): Contact[] {
  return defaultContacts.map((contact) => ({ ...contact }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isAvatarMode(value: unknown): value is AvatarMode {
  return value === "qq" || value === "custom"
}

function normalizeUnreadCount(value: unknown, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(0, Math.floor(value))
}

/**
 * Merge persisted data with the bundled record. This keeps storage resilient
 * when new Contact fields are introduced in a later application version.
 */
function hydrateContact(value: unknown, fallback: Contact): Contact {
  if (!isRecord(value)) {
    return { ...fallback }
  }

  return {
    id: fallback.id,
    qq: typeof value.qq === "string" ? value.qq : fallback.qq,
    name: typeof value.name === "string" ? value.name : fallback.name,
    avatarMode: isAvatarMode(value.avatarMode)
      ? value.avatarMode
      : fallback.avatarMode,
    customAvatarUrl:
      typeof value.customAvatarUrl === "string"
        ? value.customAvatarUrl
        : fallback.customAvatarUrl,
    lastMessage:
      typeof value.lastMessage === "string"
        ? value.lastMessage
        : fallback.lastMessage,
    timeLabel:
      typeof value.timeLabel === "string" ? value.timeLabel : fallback.timeLabel,
    muted: typeof value.muted === "boolean" ? value.muted : fallback.muted,
    unreadCount: normalizeUnreadCount(value.unreadCount, fallback.unreadCount),
    online: typeof value.online === "boolean" ? value.online : fallback.online,
  }
}

function loadContacts(): Contact[] {
  if (typeof window === "undefined") {
    return cloneDefaultContacts()
  }

  try {
    const serialized = window.localStorage.getItem(CONTACTS_STORAGE_KEY)

    if (!serialized) {
      return cloneDefaultContacts()
    }

    const parsed: unknown = JSON.parse(serialized)

    if (!Array.isArray(parsed)) {
      return cloneDefaultContacts()
    }

    const storedById = new Map(
      parsed
        .filter(isRecord)
        .filter((contact) => typeof contact.id === "string")
        .map((contact) => [contact.id as string, contact]),
    )

    return defaultContacts.map((contact) =>
      hydrateContact(storedById.get(contact.id), contact),
    )
  } catch {
    return cloneDefaultContacts()
  }
}

function persistContacts(contacts: Contact[]) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts))
  } catch {
    // Storage can be disabled, full, or unavailable in a privacy context.
  }
}

export function useContactStore(): ContactStore {
  const [contacts, setContacts] = useState<Contact[]>(loadContacts)

  useEffect(() => {
    persistContacts(contacts)
  }, [contacts])

  const updateContact = useCallback(
    (id: Contact["id"], update: ContactUpdater) => {
      setContacts((currentContacts) =>
        currentContacts.map((contact) => {
          if (contact.id !== id) {
            return contact
          }

          const patch = typeof update === "function" ? update(contact) : update

          return hydrateContact(
            {
              ...contact,
              ...patch,
              id: contact.id,
            },
            contact,
          )
        }),
      )
    },
    [],
  )

  const resetContacts = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(CONTACTS_STORAGE_KEY)
      } catch {
        // The in-memory reset still succeeds if storage is unavailable.
      }
    }

    setContacts(cloneDefaultContacts())
  }, [])

  return { contacts, updateContact, resetContacts }
}
