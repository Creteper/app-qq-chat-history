import { useCallback, useEffect, useState } from "react"

import { defaultContacts } from "@/data/chat-data"
import type { AvatarMode, Contact, ContactPatch } from "@/types/chat"

export const CONTACTS_STORAGE_KEY = "fake-qq.contacts.v1"

type ContactUpdater = ContactPatch | ((contact: Contact) => ContactPatch)

export interface ContactStore {
  contacts: Contact[]
  addContact: (initial?: ContactPatch) => Contact
  updateContact: (id: Contact["id"], update: ContactUpdater) => void
  resetContacts: () => void
}

let fallbackContactIdSequence = 0

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

function isSafeContactId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)
  )
}

function createNewContact(id: Contact["id"]): Contact {
  return {
    id,
    qq: "",
    name: "新联系人",
    avatarMode: "qq",
    customAvatarUrl: "",
    lastMessage: "暂无聊天记录",
    timeLabel: "",
    muted: false,
    unreadCount: 0,
    online: false,
  }
}

function createUniqueContactId(contacts: Contact[]) {
  const existingIds = new Set(contacts.map((contact) => contact.id))
  let candidate = ""

  do {
    const token =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${Date.now().toString(36)}-${(fallbackContactIdSequence += 1).toString(36)}`

    candidate = `contact-${token}`
  } while (existingIds.has(candidate))

  return candidate
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

    const storedContacts: Record<string, unknown>[] = []
    const seenIds = new Set<string>()

    for (const candidate of parsed) {
      if (
        !isRecord(candidate) ||
        !isSafeContactId(candidate.id) ||
        seenIds.has(candidate.id)
      ) {
        continue
      }

      seenIds.add(candidate.id)
      storedContacts.push(candidate)
    }

    const storedById = new Map(
      storedContacts.map((contact) => [contact.id as string, contact]),
    )
    const defaultIds = new Set(defaultContacts.map((contact) => contact.id))
    const hydratedDefaults = defaultContacts.map((contact) =>
      hydrateContact(storedById.get(contact.id), contact),
    )
    const customContacts = storedContacts
      .filter((contact) => !defaultIds.has(contact.id as string))
      .map((contact) => {
        const fallback = createNewContact(contact.id as string)
        return hydrateContact(contact, fallback)
      })

    return [...hydratedDefaults, ...customContacts]
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

  const addContact = useCallback(
    (initial: ContactPatch = {}) => {
      const fallback = createNewContact(createUniqueContactId(contacts))
      const contact = hydrateContact(
        {
          ...fallback,
          ...initial,
        },
        fallback,
      )

      setContacts((currentContacts) => [...currentContacts, contact])
      return contact
    },
    [contacts],
  )

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

  return { contacts, addContact, updateContact, resetContacts }
}
