import {
  BellOff,
  RotateCcw,
  UserPlusIcon,
  UserRoundXIcon,
} from "lucide-react"

import {
  LocalImageField,
  type StoredLocalImage,
} from "@/components/LocalImageField"
import { MessageEditor } from "@/components/MessageEditor"
import { ContactAvatarImage } from "@/components/ResolvedAvatarImage"
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  deleteLocalImage,
  isLocalImageReference,
} from "@/lib/local-image-store"
import type { Contact, ContactPatch, Message } from "@/types/chat"

export interface SettingsPanelProps {
  contacts: Contact[]
  messages: Message[]
  selectedId: string
  onAddContact: () => void
  onSelect: (id: string) => void
  onChange: (id: string, patch: ContactPatch) => void
  onAddMessage: (contactId: string, message: Message) => void
  onUpdateMessage: (
    contactId: string,
    messageId: string,
    nextMessage: Message,
  ) => void
  onDeleteMessage: (contactId: string, messageId: string) => void
  onReset: () => void
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toLocaleUpperCase() || "Q"
}

function toNonNegativeInteger(value: string) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.trunc(parsed)))
}

function toNonNegativeDigits(value: string) {
  return value.replace(/\D/g, "")
}

export function SettingsPanel({
  contacts,
  messages,
  selectedId,
  onAddContact,
  onSelect,
  onChange,
  onAddMessage,
  onUpdateMessage,
  onDeleteMessage,
  onReset,
}: SettingsPanelProps) {
  const selectedContact =
    contacts.find((contact) => contact.id === selectedId) ?? contacts[0]

  const updateSelectedContact = (patch: ContactPatch) => {
    if (selectedContact) {
      onChange(selectedContact.id, patch)
    }
  }

  const discardLocalImage = (source: string) => {
    if (isLocalImageReference(source)) {
      void deleteLocalImage(source).catch(() => undefined)
    }
  }

  const restoreQQAvatar = () => {
    if (!selectedContact) {
      return
    }

    const previousSource = selectedContact.customAvatarUrl
    updateSelectedContact({
      avatarMode: "qq",
      customAvatarUrl: isLocalImageReference(previousSource)
        ? ""
        : previousSource,
    })
    discardLocalImage(previousSource)
  }

  const useStoredAvatar = (image: StoredLocalImage) => {
    if (!selectedContact) {
      return
    }

    const previousSource = selectedContact.customAvatarUrl
    updateSelectedContact({
      avatarMode: "custom",
      customAvatarUrl: image.reference,
    })

    if (previousSource !== image.reference) {
      discardLocalImage(previousSource)
    }
  }

  return (
    <section className="settings-panel" aria-label="聊天记录设置">
      <Card className="settings-directory-card">
        <CardHeader className="settings-directory-header">
          <CardTitle className="settings-directory-title">联系人</CardTitle>
          <CardDescription className="settings-directory-description">
            选择一位联系人编辑聊天列表资料
          </CardDescription>
          <CardAction className="settings-directory-action">
            <Button
              aria-label="新增联系人"
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={onAddContact}
            >
              <UserPlusIcon />
            </Button>
          </CardAction>
        </CardHeader>

        <Separator className="settings-card-separator" />

        <CardContent className="settings-directory-content">
          <ScrollArea className="settings-directory-scroll">
            <nav className="settings-contact-list" aria-label="联系人列表">
              {contacts.map((contact) => {
                const isSelected = contact.id === selectedContact?.id

                return (
                  <Button
                    key={contact.id}
                    type="button"
                    variant="ghost"
                    className="settings-contact-row"
                    data-selected={isSelected}
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => onSelect(contact.id)}
                  >
                    <Avatar className="settings-contact-avatar" size="lg">
                      <ContactAvatarImage
                        alt={`${contact.name || "联系人"}的头像`}
                        contact={contact}
                        size={80}
                      />
                      <AvatarFallback>{getInitial(contact.name)}</AvatarFallback>
                      {contact.online ? (
                        <AvatarBadge
                          className="settings-contact-online"
                          aria-label="在线"
                        />
                      ) : null}
                    </Avatar>

                    <span className="settings-contact-copy">
                      <span className="settings-contact-heading">
                        <span className="settings-contact-name">
                          {contact.name || `QQ ${contact.qq}`}
                        </span>
                        <span className="settings-contact-time">
                          {contact.timeLabel}
                        </span>
                      </span>

                      <span className="settings-contact-summary">
                        <span className="settings-contact-message">
                          {contact.lastMessage || "暂无聊天记录"}
                        </span>

                        {contact.unreadCount > 0 ? (
                          <Badge
                            className="settings-contact-unread"
                            data-muted={contact.muted || undefined}
                            variant={
                              contact.muted ? "secondary" : "destructive"
                            }
                          >
                            {contact.unreadCount > 99
                              ? "99+"
                              : contact.unreadCount}
                          </Badge>
                        ) : contact.muted ? (
                          <span
                            className="settings-contact-muted"
                            role="img"
                            aria-label="已开启消息免打扰"
                          >
                            <BellOff aria-hidden="true" />
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Button>
                )
              })}
            </nav>
          </ScrollArea>
        </CardContent>

        <CardFooter className="settings-directory-footer">
          <span className="settings-contact-count">
            共 {contacts.length} 位联系人
          </span>
        </CardFooter>
      </Card>

      <Card className="settings-editor-card">
        <CardHeader className="settings-editor-header">
          <CardTitle className="settings-editor-title">联系人资料</CardTitle>
          <CardDescription className="settings-editor-description">
            {selectedContact
              ? `正在编辑 ${selectedContact.name || `QQ ${selectedContact.qq}`}`
              : "请先从左侧选择联系人"}
          </CardDescription>

          {selectedContact ? (
            <CardAction className="settings-editor-action">
              <Avatar className="settings-editor-avatar" size="lg">
                <ContactAvatarImage
                  alt={`${selectedContact.name || "联系人"}的头像`}
                  contact={selectedContact}
                  size={100}
                />
                <AvatarFallback>
                  {getInitial(selectedContact.name)}
                </AvatarFallback>
                {selectedContact.online ? (
                  <AvatarBadge
                    className="settings-editor-online"
                    aria-label="在线"
                  />
                ) : null}
              </Avatar>
            </CardAction>
          ) : null}
        </CardHeader>

        <Separator className="settings-card-separator" />

        <CardContent className="settings-editor-content">
          {selectedContact ? (
            <ScrollArea className="settings-editor-scroll">
              <div className="settings-editor-sections">
                <form
                  className="settings-editor-form"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <FieldGroup className="settings-field-group">
                  <Field
                    className="settings-avatar-preview-field"
                    orientation="horizontal"
                  >
                    <Avatar className="settings-avatar-preview">
                      <ContactAvatarImage
                        alt={`${selectedContact.name || "联系人"}的头像预览`}
                        contact={selectedContact}
                        size={160}
                      />
                      <AvatarFallback>
                        {getInitial(selectedContact.name)}
                      </AvatarFallback>
                      {selectedContact.online ? (
                        <AvatarBadge
                          className="settings-avatar-preview-online"
                          aria-label="在线"
                        />
                      ) : null}
                    </Avatar>

                    <FieldContent className="settings-avatar-preview-copy">
                      <FieldTitle className="settings-avatar-preview-title">
                        头像预览
                      </FieldTitle>
                      <FieldDescription className="settings-avatar-preview-description">
                        {selectedContact.avatarMode === "qq"
                          ? `来自 QQ ${selectedContact.qq}`
                          : isLocalImageReference(
                                selectedContact.customAvatarUrl,
                              )
                            ? "来自本机图片（已自动保存）"
                            : "来自自定义图片链接"}
                      </FieldDescription>
                    </FieldContent>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="settings-avatar-reset"
                      disabled={selectedContact.avatarMode === "qq"}
                      onClick={restoreQQAvatar}
                    >
                      <RotateCcw data-icon="inline-start" />
                      恢复 QQ 头像
                    </Button>
                  </Field>

                  <Field className="settings-field">
                    <FieldLabel
                      className="settings-field-label"
                      htmlFor="settings-contact-qq"
                    >
                      QQ 号
                    </FieldLabel>
                    <Input
                      id="settings-contact-qq"
                      className="settings-field-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={selectedContact.qq}
                      onChange={(event) =>
                        updateSelectedContact({
                          qq: toNonNegativeDigits(event.target.value),
                        })
                      }
                    />
                    <FieldDescription className="settings-field-description">
                      使用 QQ 头像时会根据此号码自动更新头像地址。
                    </FieldDescription>
                  </Field>

                  <Field
                    className="settings-field settings-avatar-mode-field"
                    orientation="horizontal"
                  >
                    <FieldContent className="settings-field-copy">
                      <FieldLabel
                        className="settings-field-label"
                        htmlFor="settings-contact-avatar-mode"
                      >
                        使用 QQ 头像
                      </FieldLabel>
                      <FieldDescription className="settings-field-description">
                        关闭后使用下方选择的本机图片或自定义头像链接。
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="settings-contact-avatar-mode"
                      className="settings-field-switch"
                      checked={selectedContact.avatarMode === "qq"}
                      onCheckedChange={(checked) =>
                        checked
                          ? restoreQQAvatar()
                          : updateSelectedContact({ avatarMode: "custom" })
                      }
                    />
                  </Field>

                  <LocalImageField
                    key={selectedContact.id}
                    description="选择后会复制到本机保存，并自动切换为自定义头像。"
                    descriptionClassName="settings-field-description"
                    fieldClassName="settings-field"
                    id="settings-contact-avatar-file"
                    inputClassName="settings-field-input settings-avatar-file-input"
                    label="本地头像"
                    labelClassName="settings-field-label"
                    onStored={useStoredAvatar}
                  />

                  <Field
                    className="settings-field"
                    data-disabled={selectedContact.avatarMode === "qq"}
                  >
                    <FieldLabel
                      className="settings-field-label"
                      htmlFor="settings-contact-avatar-url"
                    >
                      自定义头像 URL
                    </FieldLabel>
                    <Input
                      id="settings-contact-avatar-url"
                      className="settings-field-input"
                      type="url"
                      placeholder={
                        isLocalImageReference(
                          selectedContact.customAvatarUrl,
                        )
                          ? "当前使用已保存的本机头像"
                          : "https://example.com/avatar.png"
                      }
                      disabled={selectedContact.avatarMode === "qq"}
                      value={
                        isLocalImageReference(
                          selectedContact.customAvatarUrl,
                        )
                          ? ""
                          : selectedContact.customAvatarUrl
                      }
                      onChange={(event) => {
                        const previousSource =
                          selectedContact.customAvatarUrl
                        updateSelectedContact({
                          customAvatarUrl: event.target.value,
                        })
                        discardLocalImage(previousSource)
                      }}
                    />
                    <FieldDescription className="settings-field-description">
                      填写链接会替换当前选择的本机头像。
                    </FieldDescription>
                  </Field>

                  <Separator className="settings-form-separator" />

                  <Field className="settings-field">
                    <FieldLabel
                      className="settings-field-label"
                      htmlFor="settings-contact-name"
                    >
                      名称
                    </FieldLabel>
                    <Input
                      id="settings-contact-name"
                      className="settings-field-input"
                      value={selectedContact.name}
                      maxLength={32}
                      onChange={(event) =>
                        updateSelectedContact({ name: event.target.value })
                      }
                    />
                  </Field>

                  <Field className="settings-field">
                    <FieldLabel
                      className="settings-field-label"
                      htmlFor="settings-contact-last-message"
                    >
                      最近一条聊天记录
                    </FieldLabel>
                    <Input
                      id="settings-contact-last-message"
                      className="settings-field-input"
                      value={selectedContact.lastMessage}
                      maxLength={120}
                      onChange={(event) =>
                        updateSelectedContact({
                          lastMessage: event.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field className="settings-field">
                    <FieldLabel
                      className="settings-field-label"
                      htmlFor="settings-contact-time"
                    >
                      时间
                    </FieldLabel>
                    <Input
                      id="settings-contact-time"
                      className="settings-field-input"
                      placeholder="18:11 或 07/07"
                      value={selectedContact.timeLabel}
                      maxLength={16}
                      onChange={(event) =>
                        updateSelectedContact({
                          timeLabel: event.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field
                    className="settings-field settings-muted-field"
                    orientation="horizontal"
                  >
                    <FieldContent className="settings-field-copy">
                      <FieldLabel
                        className="settings-field-label"
                        htmlFor="settings-contact-muted"
                      >
                        消息免打扰
                      </FieldLabel>
                      <FieldDescription className="settings-field-description">
                        有未读时使用灰色角标；无未读时显示免打扰图标。
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="settings-contact-muted"
                      className="settings-field-switch"
                      checked={selectedContact.muted}
                      onCheckedChange={(checked) =>
                        updateSelectedContact({ muted: checked })
                      }
                    />
                  </Field>

                  <Field className="settings-field">
                    <FieldLabel
                      className="settings-field-label"
                      htmlFor="settings-contact-unread"
                    >
                      未读消息数
                    </FieldLabel>
                    <Input
                      id="settings-contact-unread"
                      className="settings-field-input"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={selectedContact.unreadCount}
                      onChange={(event) =>
                        updateSelectedContact({
                          unreadCount: toNonNegativeInteger(event.target.value),
                        })
                      }
                    />
                    <FieldDescription className="settings-field-description">
                      设为 0 时不显示未读角标。
                    </FieldDescription>
                  </Field>
                  </FieldGroup>
                </form>

                <Separator className="settings-editor-section-separator" />

                <MessageEditor
                  key={selectedContact.id}
                  contact={selectedContact}
                  messages={messages}
                  onAdd={(message) =>
                    onAddMessage(selectedContact.id, message)
                  }
                  onDelete={(messageId) =>
                    onDeleteMessage(selectedContact.id, messageId)
                  }
                  onUpdate={(messageId, nextMessage) =>
                    onUpdateMessage(
                      selectedContact.id,
                      messageId,
                      nextMessage,
                    )
                  }
                />
              </div>
            </ScrollArea>
          ) : (
            <Empty className="settings-editor-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserRoundXIcon />
                </EmptyMedia>
                <EmptyTitle>暂无联系人</EmptyTitle>
                <EmptyDescription>
                  当前没有可编辑的联系人资料。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>

        <CardFooter className="settings-editor-footer">
          <CardDescription className="settings-disclaimer">
            本软件仅供娱乐和个人使用，请勿对外传播或分发
          </CardDescription>
          <Button
            type="button"
            variant="outline"
            className="settings-reset-all"
            onClick={onReset}
          >
            <RotateCcw data-icon="inline-start" />
            恢复全部默认数据
          </Button>
        </CardFooter>
      </Card>
    </section>
  )
}

export default SettingsPanel
