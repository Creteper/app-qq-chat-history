import type { ComponentProps } from "react"

import { AvatarImage } from "@/components/ui/avatar"
import {
  useContactAvatar,
  useQQAvatar,
} from "@/hooks/use-qq-avatar"
import type { Contact } from "@/types/chat"

type AvatarImageProps = Omit<ComponentProps<typeof AvatarImage>, "src">

type QQAvatarImageProps = AvatarImageProps & {
  qq: number | string
  size?: number
}

export function QQAvatarImage({
  qq,
  size = 100,
  ...props
}: QQAvatarImageProps) {
  const source = useQQAvatar(qq, size)
  return <AvatarImage {...props} referrerPolicy="no-referrer" src={source} />
}

type ContactAvatarImageProps = AvatarImageProps & {
  contact: Pick<Contact, "qq" | "avatarMode" | "customAvatarUrl">
  size?: number
}

export function ContactAvatarImage({
  contact,
  size = 100,
  ...props
}: ContactAvatarImageProps) {
  const source = useContactAvatar(contact, size)
  return <AvatarImage {...props} referrerPolicy="no-referrer" src={source} />
}
