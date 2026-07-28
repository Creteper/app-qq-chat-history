import { invoke, isTauri } from "@tauri-apps/api/core"

import type { Contact } from "@/types/chat"

export type QQAvatarParams = {
  qq: number
  size?: number
}

/**
 * Get QQ avatar URL.
 *
 * q1.qlogo.cn is unavailable due to TLS restrictions, so the QQ Zone image
 * host is used instead.
 */
export function getQQAvatar(params: QQAvatarParams) {
  return `https://qlogo2.store.qq.com/qzone/${params.qq}/${params.qq}/${params.size || 100}`
}

const AVATAR_CACHE_ENTRY_LIMIT = 128
const AVATAR_CACHE_CHARACTER_LIMIT = 8 * 1024 * 1024

const avatarCache = new Map<string, string>()
const pendingAvatarRequests = new Map<string, Promise<string>>()
let avatarCacheCharacters = 0

function getCachedAvatar(key: string) {
  const cached = avatarCache.get(key)

  if (cached === undefined) {
    return undefined
  }

  avatarCache.delete(key)
  avatarCache.set(key, cached)
  return cached
}

function cacheAvatar(key: string, dataUrl: string) {
  const previous = avatarCache.get(key)

  if (previous !== undefined) {
    avatarCacheCharacters -= previous.length
    avatarCache.delete(key)
  }

  avatarCache.set(key, dataUrl)
  avatarCacheCharacters += dataUrl.length

  while (
    avatarCache.size > AVATAR_CACHE_ENTRY_LIMIT ||
    avatarCacheCharacters > AVATAR_CACHE_CHARACTER_LIMIT
  ) {
    const evictionKey = avatarCache.keys().next().value

    if (evictionKey === undefined) {
      break
    }

    const evicted = avatarCache.get(evictionKey)
    avatarCache.delete(evictionKey)
    avatarCacheCharacters -= evicted?.length ?? 0
  }
}

export function normalizeQQAvatarSize(size?: number) {
  return size && size > 100 ? 640 : 100
}

function getAvatarCacheKey(params: QQAvatarParams) {
  return `${params.qq}:${normalizeQQAvatarSize(params.size)}`
}

function isValidQQ(qq: number) {
  return Number.isSafeInteger(qq) && qq > 0
}

/**
 * Fetch a QQ avatar through the native Tauri backend.
 *
 * chat-generator uses a Nuxt server endpoint to turn the remote image into a
 * base64 data URL. A packaged Tauri app has no Nuxt server, so its Rust command
 * provides the equivalent proxy. Browser-only previews keep the direct URL.
 */
export async function fetchQQAvatar(params: QQAvatarParams) {
  if (!isValidQQ(params.qq)) {
    return ""
  }

  const requestParams = {
    ...params,
    size: normalizeQQAvatarSize(params.size),
  }
  const directUrl = getQQAvatar(requestParams)

  if (!isTauri()) {
    return directUrl
  }

  const cacheKey = getAvatarCacheKey(requestParams)
  const cached = getCachedAvatar(cacheKey)

  if (cached) {
    return cached
  }

  const pending = pendingAvatarRequests.get(cacheKey)

  if (pending) {
    return pending
  }

  const request = invoke<string>("fetch_qq_avatar", {
    qq: String(requestParams.qq),
    size: requestParams.size,
  })
    .then((dataUrl) => {
      if (!dataUrl.startsWith("data:image/")) {
        throw new Error("QQ 头像代理返回了无效图片")
      }

      cacheAvatar(cacheKey, dataUrl)
      return dataUrl
    })
    .catch((error: unknown) => {
      console.error(`[fetchQQAvatar] failed for QQ ${params.qq}`, error)
      return ""
    })
    .finally(() => {
      pendingAvatarRequests.delete(cacheKey)
    })

  pendingAvatarRequests.set(cacheKey, request)
  return request
}

/**
 * Resolve either a user-supplied avatar or the QQ avatar endpoint.
 * Empty custom URLs gracefully fall back to the QQ avatar.
 */
export function getContactAvatar(
  contact: Pick<Contact, "qq" | "avatarMode" | "customAvatarUrl">,
  size = 100,
) {
  const customAvatarUrl = contact.customAvatarUrl.trim()

  if (contact.avatarMode === "custom" && customAvatarUrl) {
    return customAvatarUrl
  }

  const qq = Number(contact.qq)
  return isValidQQ(qq)
    ? getQQAvatar({ qq, size: normalizeQQAvatarSize(size) })
    : ""
}
