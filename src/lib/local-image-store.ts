/**
 * Persistent storage for user-selected images.
 *
 * Image data intentionally lives in IndexedDB rather than localStorage.  The
 * application state only needs to retain the small, stable reference returned
 * by `saveLocalImage`.
 */

export const LOCAL_IMAGE_REFERENCE_PREFIX = "qq-local-image://"
export const MAX_LOCAL_IMAGE_BYTES = 25 * 1024 * 1024

const DATABASE_NAME = "qq-chat-history-local-images"
const DATABASE_VERSION = 1
const IMAGE_STORE_NAME = "images"

type LocalImageRecord = {
  id: string
  blob: Blob
  createdAt: number
  type: string
  size: number
}

export type LocalImageReference =
  `${typeof LOCAL_IMAGE_REFERENCE_PREFIX}${string}`

const NOOP = () => {
  // Kept as a shared callback so pass-through sources do not allocate a
  // function for every render.
}

let databasePromise: Promise<IDBDatabase> | null = null

function getReferenceId(reference: string): string | null {
  if (typeof reference !== "string") {
    return null
  }

  const value = reference.trim()
  if (!value.startsWith(LOCAL_IMAGE_REFERENCE_PREFIX)) {
    return null
  }

  const id = value.slice(LOCAL_IMAGE_REFERENCE_PREFIX.length)
  // IDs are generated locally and are deliberately URL-safe.  Rejecting
  // malformed references prevents an arbitrary key from being interpreted as
  // a local image.
  return /^[A-Za-z0-9_-]+$/.test(id) ? id : null
}

export function isLocalImageReference(
  value: string | null | undefined,
): value is LocalImageReference {
  return typeof value === "string" && getReferenceId(value) !== null
}

function createImageId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }

  const randomPart = Math.random().toString(36).slice(2)
  return `${Date.now().toString(36)}-${randomPart}`
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) {
    return databasePromise
  }

  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("IndexedDB is unavailable in this environment"),
    )
  }

  const nextDatabasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        database.createObjectStore(IMAGE_STORE_NAME, { keyPath: "id" })
      }
    }

    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => {
        database.close()
        databasePromise = null
      }
      resolve(database)
    }

    request.onerror = () => {
      databasePromise = null
      reject(request.error ?? new Error("Unable to open image storage"))
    }

    request.onblocked = () => {
      // A blocked upgrade may eventually continue after another tab closes
      // its connection.  Keep the request pending instead of rejecting early.
    }
  }).catch((error: unknown) => {
    databasePromise = null
    throw error
  })

  databasePromise = nextDatabasePromise
  return nextDatabasePromise
}

function readImageRecord(id: string): Promise<LocalImageRecord | undefined> {
  return openDatabase().then(
    (database) =>
      new Promise<LocalImageRecord | undefined>((resolve, reject) => {
        let request: IDBRequest<LocalImageRecord | undefined>

        try {
          const transaction = database.transaction(
            IMAGE_STORE_NAME,
            "readonly",
          )
          request = transaction
            .objectStore(IMAGE_STORE_NAME)
            .get(id) as IDBRequest<LocalImageRecord | undefined>
          request.onsuccess = () => resolve(request.result)
          request.onerror = () =>
            reject(request.error ?? new Error("Unable to read local image"))
          transaction.onerror = () =>
            reject(
              transaction.error ?? new Error("Unable to read local image"),
            )
          transaction.onabort = () =>
            reject(
              transaction.error ?? new Error("Unable to read local image"),
            )
        } catch (error) {
          reject(error)
        }
      }),
  )
}

/**
 * Save a selected image and return the small reference that can safely be
 * persisted with a contact or message.
 */
export async function saveLocalImage(
  image: Blob,
): Promise<LocalImageReference> {
  if (!(image instanceof Blob)) {
    throw new TypeError("请选择有效的图片文件。")
  }

  if (!image.type.toLowerCase().startsWith("image/")) {
    throw new TypeError("请选择图片文件。")
  }

  if (image.size === 0) {
    throw new Error("图片文件不能为空。")
  }

  if (image.size > MAX_LOCAL_IMAGE_BYTES) {
    throw new Error("图片大小不能超过 25 MB。")
  }

  const id = createImageId()
  const record: LocalImageRecord = {
    id,
    blob: image,
    createdAt: Date.now(),
    type: image.type,
    size: image.size,
  }
  const database = await openDatabase()

  await new Promise<void>((resolve, reject) => {
    try {
      const transaction = database.transaction(IMAGE_STORE_NAME, "readwrite")
      transaction.objectStore(IMAGE_STORE_NAME).put(record)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(
          transaction.error ?? new Error("Unable to save local image"),
        )
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Unable to save local image"))
    } catch (error) {
      reject(error)
    }
  })

  return `${LOCAL_IMAGE_REFERENCE_PREFIX}${id}` as LocalImageReference
}

/**
 * Read the original image blob for a local reference.  Non-local or missing
 * references resolve to null, making cleanup and migration calls safe.
 */
export async function getLocalImage(
  reference: string | null | undefined,
): Promise<Blob | null> {
  const id = typeof reference === "string" ? getReferenceId(reference) : null
  if (!id) {
    return null
  }

  const record = await readImageRecord(id)
  return record?.blob instanceof Blob ? record.blob : null
}

/**
 * Delete a local image.  Returns true when the argument was a valid local
 * reference; deleting a non-local reference is a harmless no-op.
 */
export async function deleteLocalImage(
  reference: string | null | undefined,
): Promise<boolean> {
  const id = typeof reference === "string" ? getReferenceId(reference) : null
  if (!id) {
    return false
  }

  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    try {
      const transaction = database.transaction(IMAGE_STORE_NAME, "readwrite")
      transaction.objectStore(IMAGE_STORE_NAME).delete(id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(
          transaction.error ?? new Error("Unable to delete local image"),
        )
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Unable to delete local image"))
    } catch (error) {
      reject(error)
    }
  })

  return true
}

/**
 * Remove every locally stored image.  This is intended for the application's
 * "restore all defaults" action; contact/message references should be reset in
 * the same action so that no stale references remain in localStorage.
 */
export async function clearLocalImages(): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    try {
      const transaction = database.transaction(IMAGE_STORE_NAME, "readwrite")
      transaction.objectStore(IMAGE_STORE_NAME).clear()
      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(
          transaction.error ?? new Error("Unable to clear local images"),
        )
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Unable to clear local images"))
    } catch (error) {
      reject(error)
    }
  })
}

export type ResolvedImageSource = {
  /**
   * A normal image source (`http:`, `data:`, `blob:`, etc.), or a temporary
   * object URL for an IndexedDB-backed image.  Empty means the local record
   * no longer exists or could not be read.
   */
  source: string
  /** Revoke a temporary object URL when the image is no longer displayed. */
  release: () => void
}

/**
 * Resolve a source for an `<img>`.  Existing URL/data/blob sources are
 * returned unchanged.  Local references are loaded from IndexedDB and
 * converted to a revocable object URL.
 */
export async function resolveImageSource(
  source: string | null | undefined,
): Promise<ResolvedImageSource> {
  const value = typeof source === "string" ? source : ""
  if (!isLocalImageReference(value)) {
    return { source: value, release: NOOP }
  }

  const blob = await getLocalImage(value)
  if (!blob || typeof URL === "undefined") {
    return { source: "", release: NOOP }
  }

  const objectUrl = URL.createObjectURL(blob)
  let released = false
  return {
    source: objectUrl,
    release: () => {
      if (!released) {
        released = true
        URL.revokeObjectURL(objectUrl)
      }
    },
  }
}
