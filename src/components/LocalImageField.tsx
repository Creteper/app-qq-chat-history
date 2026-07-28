import { useState, type ChangeEvent } from "react"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  deleteLocalImage,
  saveLocalImage,
  type LocalImageReference,
} from "@/lib/local-image-store"
import { cn } from "@/lib/utils"

export type StoredLocalImage = {
  fileName: string
  height: number
  reference: LocalImageReference
  width: number
}

type LocalImageFieldProps = {
  description: string
  descriptionClassName?: string
  disabled?: boolean
  fieldClassName?: string
  id: string
  inputClassName?: string
  label: string
  labelClassName?: string
  onStored: (image: StoredLocalImage) => void | Promise<void>
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "图片保存失败，请重新选择。"
}

async function readImageDimensions(image: Blob) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(image)
      const dimensions = {
        width: bitmap.width,
        height: bitmap.height,
      }
      bitmap.close()

      if (dimensions.width > 0 && dimensions.height > 0) {
        return dimensions
      }
    } catch {
      // Some WebViews cannot decode SVG/HEIC through createImageBitmap.
    }
  }

  const objectUrl = URL.createObjectURL(image)

  try {
    return await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const preview = new Image()

        preview.onload = () => {
          if (preview.naturalWidth > 0 && preview.naturalHeight > 0) {
            resolve({
              width: preview.naturalWidth,
              height: preview.naturalHeight,
            })
            return
          }

          reject(new Error("无法读取图片尺寸。"))
        }
        preview.onerror = () => reject(new Error("无法读取所选图片。"))
        preview.src = objectUrl
      },
    )
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function LocalImageField({
  description,
  descriptionClassName,
  disabled = false,
  fieldClassName,
  id,
  inputClassName,
  label,
  labelClassName,
  onStored,
}: LocalImageFieldProps) {
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const selectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]

    if (!file) {
      return
    }

    setError("")
    setSaving(true)
    let reference: LocalImageReference | null = null

    try {
      reference = await saveLocalImage(file)
      const dimensions = await readImageDimensions(file)

      await onStored({
        fileName: file.name,
        height: dimensions.height,
        reference,
        width: dimensions.width,
      })
    } catch (nextError) {
      if (reference) {
        void deleteLocalImage(reference)
      }
      setError(getErrorMessage(nextError))
    } finally {
      setSaving(false)
      input.value = ""
    }
  }

  return (
    <Field className={fieldClassName} data-invalid={error ? true : undefined}>
      <FieldLabel className={labelClassName} htmlFor={id}>
        {label}
      </FieldLabel>
      <Input
        accept="image/*"
        aria-busy={saving}
        aria-invalid={error ? true : undefined}
        className={cn(inputClassName)}
        disabled={disabled || saving}
        id={id}
        type="file"
        onChange={(event) => void selectImage(event)}
      />
      <FieldDescription className={descriptionClassName}>
        {saving ? "正在保存到本机…" : description}
      </FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
