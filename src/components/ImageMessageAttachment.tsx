import { useState, type CSSProperties } from "react"
import { ImageIcon } from "lucide-react"

import {
  Attachment,
  AttachmentMedia,
} from "@/components/ui/attachment"
import { useResolvedImageSource } from "@/hooks/use-resolved-image-source"
import { cn } from "@/lib/utils"
import type { ImageMessage } from "@/types/chat"

type ImageDimensions = {
  width: number
  height: number
}

type LoadedImageDimensions = ImageDimensions & {
  src: string
}

type ImageMessageAttachmentProps = {
  className?: string
  loading?: "eager" | "lazy"
  maxHeight?: number
  maxWidth?: number
  message: ImageMessage
}

const fallbackDimensions: ImageDimensions = {
  width: 220,
  height: 165,
}

function getValidDimensions(
  width: number | undefined,
  height: number | undefined,
): ImageDimensions | null {
  if (
    typeof width === "number" &&
    Number.isFinite(width) &&
    width > 0 &&
    typeof height === "number" &&
    Number.isFinite(height) &&
    height > 0
  ) {
    return { width, height }
  }

  return null
}

function getDisplayWidth(
  dimensions: ImageDimensions,
  maxWidth: number,
  maxHeight: number,
) {
  const scale = Math.min(
    1,
    maxWidth / dimensions.width,
    maxHeight / dimensions.height,
  )

  return Math.max(1, Math.round(dimensions.width * scale))
}

export function ImageMessageAttachment({
  className,
  loading = "lazy",
  maxHeight = 420,
  maxWidth = 360,
  message,
}: ImageMessageAttachmentProps) {
  const [loadedDimensions, setLoadedDimensions] =
    useState<LoadedImageDimensions | null>(null)
  const source = useResolvedImageSource(message.src)

  const configuredDimensions = getValidDimensions(
    message.width,
    message.height,
  )
  const naturalDimensions =
    loadedDimensions?.src === message.src ? loadedDimensions : null
  const dimensions =
    configuredDimensions ?? naturalDimensions ?? fallbackDimensions
  const style = {
    width: getDisplayWidth(dimensions, maxWidth, maxHeight),
    aspectRatio: `${dimensions.width} / ${dimensions.height}`,
  } satisfies CSSProperties

  return (
    <Attachment
      aria-label={message.alt || "图片"}
      className={cn("image-message-attachment", className)}
      orientation="vertical"
      state={message.src ? "done" : "idle"}
      style={style}
    >
      <AttachmentMedia
        className="image-message-attachment__media"
        variant={source ? "image" : "icon"}
      >
        {source ? (
          <img
            alt={message.alt}
            draggable={false}
            height={message.height}
            loading={loading}
            onLoad={(event) => {
              const image = event.currentTarget

              if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                setLoadedDimensions({
                  src: message.src,
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                })
              }
            }}
            src={source}
            width={message.width}
          />
        ) : (
          <ImageIcon aria-hidden="true" />
        )}
      </AttachmentMedia>
    </Attachment>
  )
}
