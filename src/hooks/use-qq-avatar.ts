import { useEffect, useMemo, useState } from "react"
import { isTauri } from "@tauri-apps/api/core"

import {
  fetchQQAvatar,
  getContactAvatar,
  getQQAvatar,
  normalizeQQAvatarSize,
} from "@/lib/qq"
import type { Contact } from "@/types/chat"

function getInitialSource(qq: number, size: number) {
  if (!Number.isSafeInteger(qq) || qq <= 0) {
    return ""
  }

  return isTauri()
    ? ""
    : getQQAvatar({ qq, size: normalizeQQAvatarSize(size) })
}

export function useQQAvatar(
  qqValue: number | string,
  size = 100,
  enabled = true,
) {
  const qq = Number(qqValue)
  const initialSource = useMemo(
    () => (enabled ? getInitialSource(qq, size) : ""),
    [enabled, qq, size],
  )
  const [source, setSource] = useState(initialSource)

  useEffect(() => {
    let active = true

    setSource(initialSource)
    if (!enabled) {
      return () => {
        active = false
      }
    }

    const timeout = window.setTimeout(() => {
      void fetchQQAvatar({ qq, size }).then((nextSource) => {
        if (active) {
          setSource(nextSource)
        }
      })
    }, 180)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [enabled, initialSource, qq, size])

  return source
}

export function useContactAvatar(
  contact: Pick<Contact, "qq" | "avatarMode" | "customAvatarUrl">,
  size = 100,
) {
  const customAvatarUrl = contact.customAvatarUrl.trim()
  const usesCustomAvatar =
    contact.avatarMode === "custom" && Boolean(customAvatarUrl)
  const qqAvatar = useQQAvatar(contact.qq, size, !usesCustomAvatar)

  if (usesCustomAvatar) {
    return getContactAvatar(contact, size)
  }

  return qqAvatar
}
