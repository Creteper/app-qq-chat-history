import { useEffect, useState } from "react"

import { isLocalImageReference, resolveImageSource } from "@/lib/local-image-store"

type LocalResolution = {
  reference: string
  source: string
}

/**
 * Resolve an image source for display while retaining ordinary remote/data/blob
 * URLs unchanged.  A local IndexedDB reference is represented by a temporary
 * object URL that is revoked when the source changes or the component unmounts.
 */
export function useResolvedImageSource(source: string | null | undefined) {
  const value = typeof source === "string" ? source : ""
  const [localResolution, setLocalResolution] = useState<LocalResolution>({
    reference: "",
    source: "",
  })

  useEffect(() => {
    let active = true
    let release = () => {
      // Replaced once a local source has been resolved.
    }

    if (!isLocalImageReference(value)) {
      return () => {
        active = false
      }
    }

    void resolveImageSource(value)
      .then((result) => {
        if (!active) {
          result.release()
          return
        }

        release = result.release
        setLocalResolution({
          reference: value,
          source: result.source,
        })
      })
      .catch(() => {
        if (active) {
          setLocalResolution({
            reference: value,
            source: "",
          })
        }
      })

    return () => {
      active = false
      release()
    }
  }, [value])

  if (!isLocalImageReference(value)) {
    return value
  }

  return localResolution.reference === value
    ? localResolution.source
    : ""
}
