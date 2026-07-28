import { useEffect, useId, useState } from "react"
import {
  MessageSquareIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { ImageMessageAttachment } from "@/components/ImageMessageAttachment"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Marker, MarkerContent } from "@/components/ui/marker"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import type {
  Contact,
  Message,
  MessageDirection,
} from "@/types/chat"

export interface MessageEditorProps {
  contact: Contact
  messages: Message[]
  onAdd: (message: Message) => void
  onUpdate: (messageId: string, nextMessage: Message) => void
  onDelete: (messageId: string) => void
}

type MessageType = Message["type"]

const messageTypeOptions: Array<{
  value: MessageType
  label: string
}> = [
  { value: "text", label: "文字" },
  { value: "image", label: "图片" },
  { value: "date", label: "日期" },
  { value: "recall", label: "撤回" },
  { value: "system", label: "系统" },
]

const messageTypeLabels: Record<MessageType, string> = {
  text: "文字",
  image: "图片",
  date: "日期",
  recall: "撤回",
  system: "系统",
}

const directionOptions: Array<{
  value: MessageDirection
  label: string
}> = [
  { value: "incoming", label: "对方（左侧）" },
  { value: "outgoing", label: "自己（右侧）" },
]

let fallbackIdSequence = 0

function createUniqueMessageId(messages: Message[]) {
  const existingIds = new Set(messages.map((message) => message.id))
  let candidate = ""

  do {
    const token =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${Date.now().toString(36)}-${(fallbackIdSequence += 1).toString(36)}`

    candidate = `message-${token}`
  } while (existingIds.has(candidate))

  return candidate
}

function formatCurrentDate() {
  const now = new Date()
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ]
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ]

  return `${parts.join("/")} ${time.join(":")}`
}

function createMessage(type: MessageType, id: string): Message {
  switch (type) {
    case "text":
      return {
        id,
        type,
        direction: "outgoing",
        content: "新消息",
      }
    case "image":
      return {
        id,
        type,
        direction: "outgoing",
        src: "",
        alt: "图片",
      }
    case "date":
      return {
        id,
        type,
        content: formatCurrentDate(),
      }
    case "recall":
      return {
        id,
        type,
        direction: "outgoing",
        content: "你撤回了一条消息",
      }
    case "system":
      return {
        id,
        type,
        content: "系统消息",
      }
  }
}

function getMessageContent(message: Message) {
  if (message.type === "image") {
    return message.caption || message.alt || message.src
  }

  return message.content
}

function convertMessageType(
  message: Message,
  nextType: MessageType,
): Message {
  if (message.type === nextType) {
    return message
  }

  const content = getMessageContent(message)
  const direction =
    "direction" in message && message.direction
      ? message.direction
      : "outgoing"
  const common = {
    id: message.id,
    time: message.time,
  }

  switch (nextType) {
    case "text":
      return {
        ...common,
        type: nextType,
        direction,
        content,
      }
    case "image":
      return {
        ...common,
        type: nextType,
        direction,
        src: "",
        alt: content || "图片",
      }
    case "date":
      return {
        ...common,
        type: nextType,
        content: content || formatCurrentDate(),
      }
    case "recall":
      return {
        ...common,
        type: nextType,
        direction,
        content: content || "你撤回了一条消息",
      }
    case "system":
      return {
        ...common,
        type: nextType,
        content: content || "系统消息",
      }
  }
}

function getMessageSummary(message: Message) {
  const content = getMessageContent(message).trim()

  return content || `未填写${messageTypeLabels[message.type]}内容`
}

function toOptionalString(value: string) {
  return value === "" ? undefined : value
}

function toOptionalDimension(value: string) {
  if (value === "") {
    return undefined
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return undefined
  }

  return Math.max(1, Math.trunc(parsed))
}

function getMessageDirection(message: Message) {
  if (message.type === "text" || message.type === "image") {
    return message.direction
  }

  if (message.type === "recall") {
    return message.direction
  }

  return undefined
}

function MessagePreview({
  contact,
  message,
}: {
  contact: Contact
  message: Message
}) {
  const direction = getMessageDirection(message)
  const alignment = direction === "outgoing" ? "end" : "start"
  const side = direction ?? "center"

  return (
    <section
      className="message-editor__preview"
      aria-label="实时预览"
      data-direction={side}
    >
      <header className="message-editor__preview-header">
        <FieldTitle className="message-editor__preview-title">
          实时预览
        </FieldTitle>
        <Badge
          className="message-editor__preview-type"
          variant="secondary"
        >
          {messageTypeLabels[message.type]}
        </Badge>
      </header>

      <div
        className="message-editor__preview-stage"
        data-direction={side}
      >
        {message.type === "text" ? (
          <Bubble
            className="message-editor__preview-bubble"
            align={alignment}
            variant={
              message.direction === "outgoing" ? "tinted" : "secondary"
            }
          >
            <BubbleContent className="message-editor__preview-bubble-content">
              {message.content || "（空消息）"}
            </BubbleContent>
          </Bubble>
        ) : null}

        {message.type === "image" ? (
          <ImageMessageAttachment
            className="message-editor__preview-attachment"
            loading="eager"
            maxHeight={260}
            maxWidth={240}
            message={message}
          />
        ) : null}

        {message.type === "date" ? (
          <Marker
            className="message-editor__preview-marker"
            variant="separator"
          >
            <MarkerContent className="message-editor__preview-marker-content">
              {message.content || "（空日期）"}
            </MarkerContent>
          </Marker>
        ) : null}

        {message.type === "recall" ? (
          <Marker
            className="message-editor__preview-marker"
            data-direction={side}
          >
            <MarkerContent className="message-editor__preview-marker-content">
              {message.content || "（空撤回消息）"}
            </MarkerContent>
          </Marker>
        ) : null}

        {message.type === "system" ? (
          <Marker className="message-editor__preview-marker">
            <MarkerContent className="message-editor__preview-marker-content">
              {message.actionLabel ? (
                <span className="message-editor__preview-action">
                  {message.actionLabel}{" "}
                </span>
              ) : null}
              {message.content || "（空系统消息）"}
            </MarkerContent>
          </Marker>
        ) : null}
      </div>

      <footer className="message-editor__preview-footer">
        <span className="message-editor__preview-sender">
          {direction === "incoming"
            ? contact.name
            : direction === "outgoing"
              ? "自己"
              : "居中消息"}
        </span>
        {message.time ? (
          <span className="message-editor__preview-time">
            {message.time}
          </span>
        ) : null}
      </footer>
    </section>
  )
}

function MessageFields({
  idPrefix,
  message,
  onUpdate,
}: {
  idPrefix: string
  message: Message
  onUpdate: (nextMessage: Message) => void
}) {
  const typeLabelId = `${idPrefix}-type-label`
  const directionLabelId = `${idPrefix}-direction-label`

  return (
    <form
      className="message-editor__form"
      onSubmit={(event) => event.preventDefault()}
    >
      <FieldGroup className="message-editor__field-group">
        <Field className="message-editor__field">
          <FieldLabel
            className="message-editor__field-label"
            htmlFor={`${idPrefix}-id`}
          >
            消息 ID
          </FieldLabel>
          <Input
            className="message-editor__field-input"
            id={`${idPrefix}-id`}
            readOnly
            value={message.id}
          />
          <FieldDescription className="message-editor__field-description">
            ID 用于稳定识别这条记录，不可修改。
          </FieldDescription>
        </Field>

        <Field className="message-editor__field">
          <FieldTitle
            className="message-editor__field-title"
            id={typeLabelId}
          >
            消息类型
          </FieldTitle>
          <ToggleGroup
            className="message-editor__toggle-group"
            aria-labelledby={typeLabelId}
            spacing={1}
            value={[message.type]}
            variant="outline"
            onValueChange={(values) => {
              const nextType = values[0] as MessageType | undefined

              if (nextType) {
                onUpdate(convertMessageType(message, nextType))
              }
            }}
          >
            {messageTypeOptions.map((option) => (
              <ToggleGroupItem
                className="message-editor__toggle-item"
                key={option.value}
                value={option.value}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field className="message-editor__field">
          <FieldLabel
            className="message-editor__field-label"
            htmlFor={`${idPrefix}-time`}
          >
            详细时间
          </FieldLabel>
          <Input
            className="message-editor__field-input"
            id={`${idPrefix}-time`}
            placeholder="例如：15:42"
            value={message.time ?? ""}
            onChange={(event) =>
              onUpdate({
                ...message,
                time: toOptionalString(event.target.value),
              })
            }
          />
          <FieldDescription className="message-editor__field-description">
            可选，用于预览及消息的辅助说明。
          </FieldDescription>
        </Field>

        {message.type === "text" || message.type === "image" ? (
          <Field className="message-editor__field">
            <FieldTitle
              className="message-editor__field-title"
              id={directionLabelId}
            >
              消息方向
            </FieldTitle>
            <ToggleGroup
              className="message-editor__toggle-group"
              aria-labelledby={directionLabelId}
              spacing={1}
              value={[message.direction]}
              variant="outline"
              onValueChange={(values) => {
                const direction = values[0] as
                  | MessageDirection
                  | undefined

                if (direction) {
                  onUpdate({ ...message, direction })
                }
              }}
            >
              {directionOptions.map((option) => (
                <ToggleGroupItem
                  className="message-editor__toggle-item"
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        ) : null}

        {message.type === "recall" ? (
          <Field className="message-editor__field">
            <FieldTitle
              className="message-editor__field-title"
              id={directionLabelId}
            >
              消息方向
            </FieldTitle>
            <ToggleGroup
              className="message-editor__toggle-group"
              aria-labelledby={directionLabelId}
              spacing={1}
              value={[message.direction ?? "none"]}
              variant="outline"
              onValueChange={(values) => {
                const direction = values[0]

                if (!direction) {
                  return
                }

                onUpdate({
                  ...message,
                  direction:
                    direction === "none"
                      ? undefined
                      : (direction as MessageDirection),
                })
              }}
            >
              <ToggleGroupItem
                className="message-editor__toggle-item"
                value="none"
              >
                居中
              </ToggleGroupItem>
              {directionOptions.map((option) => (
                <ToggleGroupItem
                  className="message-editor__toggle-item"
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        ) : null}

        {message.type === "text" ? (
          <Field className="message-editor__field">
            <FieldLabel
              className="message-editor__field-label"
              htmlFor={`${idPrefix}-content`}
            >
              文字内容
            </FieldLabel>
            <Textarea
              className="message-editor__field-textarea"
              id={`${idPrefix}-content`}
              value={message.content}
              onChange={(event) =>
                onUpdate({ ...message, content: event.target.value })
              }
            />
          </Field>
        ) : null}

        {message.type === "image" ? (
          <>
            <Field className="message-editor__field">
              <FieldLabel
                className="message-editor__field-label"
                htmlFor={`${idPrefix}-src`}
              >
                图片 URL
              </FieldLabel>
              <Input
                className="message-editor__field-input"
                id={`${idPrefix}-src`}
                placeholder="https://example.com/image.png"
                type="url"
                value={message.src}
                onChange={(event) =>
                  onUpdate({ ...message, src: event.target.value })
                }
              />
            </Field>

            <Field className="message-editor__field">
              <FieldLabel
                className="message-editor__field-label"
                htmlFor={`${idPrefix}-alt`}
              >
                图片替代文本
              </FieldLabel>
              <Input
                className="message-editor__field-input"
                id={`${idPrefix}-alt`}
                value={message.alt}
                onChange={(event) =>
                  onUpdate({ ...message, alt: event.target.value })
                }
              />
            </Field>

            <Field className="message-editor__field">
              <FieldLabel
                className="message-editor__field-label"
                htmlFor={`${idPrefix}-caption`}
              >
                图片说明
              </FieldLabel>
              <Textarea
                className="message-editor__field-textarea"
                id={`${idPrefix}-caption`}
                value={message.caption ?? ""}
                onChange={(event) =>
                  onUpdate({
                    ...message,
                    caption: toOptionalString(event.target.value),
                  })
                }
              />
            </Field>

            <div className="message-editor__dimension-fields">
              <Field className="message-editor__field">
                <FieldLabel
                  className="message-editor__field-label"
                  htmlFor={`${idPrefix}-width`}
                >
                  原始宽度
                </FieldLabel>
                <Input
                  className="message-editor__field-input"
                  id={`${idPrefix}-width`}
                  min={1}
                  step={1}
                  type="number"
                  value={message.width ?? ""}
                  onChange={(event) =>
                    onUpdate({
                      ...message,
                      width: toOptionalDimension(event.target.value),
                    })
                  }
                />
              </Field>

              <Field className="message-editor__field">
                <FieldLabel
                  className="message-editor__field-label"
                  htmlFor={`${idPrefix}-height`}
                >
                  原始高度
                </FieldLabel>
                <Input
                  className="message-editor__field-input"
                  id={`${idPrefix}-height`}
                  min={1}
                  step={1}
                  type="number"
                  value={message.height ?? ""}
                  onChange={(event) =>
                    onUpdate({
                      ...message,
                      height: toOptionalDimension(event.target.value),
                    })
                  }
                />
              </Field>
            </div>
          </>
        ) : null}

        {message.type === "date" ? (
          <Field className="message-editor__field">
            <FieldLabel
              className="message-editor__field-label"
              htmlFor={`${idPrefix}-content`}
            >
              日期文本
            </FieldLabel>
            <Input
              className="message-editor__field-input"
              id={`${idPrefix}-content`}
              placeholder="2026/02/27 15:42"
              value={message.content}
              onChange={(event) =>
                onUpdate({ ...message, content: event.target.value })
              }
            />
          </Field>
        ) : null}

        {message.type === "recall" ? (
          <Field className="message-editor__field">
            <FieldLabel
              className="message-editor__field-label"
              htmlFor={`${idPrefix}-content`}
            >
              撤回提示
            </FieldLabel>
            <Textarea
              className="message-editor__field-textarea"
              id={`${idPrefix}-content`}
              value={message.content}
              onChange={(event) =>
                onUpdate({ ...message, content: event.target.value })
              }
            />
          </Field>
        ) : null}

        {message.type === "system" ? (
          <>
            <Field className="message-editor__field">
              <FieldLabel
                className="message-editor__field-label"
                htmlFor={`${idPrefix}-action-label`}
              >
                操作引导文字
              </FieldLabel>
              <Input
                className="message-editor__field-input"
                id={`${idPrefix}-action-label`}
                placeholder="例如：自定义撤回消息"
                value={message.actionLabel ?? ""}
                onChange={(event) =>
                  onUpdate({
                    ...message,
                    actionLabel: toOptionalString(event.target.value),
                  })
                }
              />
            </Field>

            <Field className="message-editor__field">
              <FieldLabel
                className="message-editor__field-label"
                htmlFor={`${idPrefix}-content`}
              >
                系统消息内容
              </FieldLabel>
              <Textarea
                className="message-editor__field-textarea"
                id={`${idPrefix}-content`}
                value={message.content}
                onChange={(event) =>
                  onUpdate({ ...message, content: event.target.value })
                }
              />
            </Field>
          </>
        ) : null}
      </FieldGroup>
    </form>
  )
}

export function MessageEditor({
  contact,
  messages,
  onAdd,
  onUpdate,
  onDelete,
}: MessageEditorProps) {
  const idPrefix = useId().replace(/:/g, "")
  const [newMessageType, setNewMessageType] =
    useState<MessageType>("text")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMessageId, setSelectedMessageId] = useState<
    string | null
  >(messages[0]?.id ?? null)

  const selectedMessage =
    messages.find((message) => message.id === selectedMessageId) ??
    messages[0]

  useEffect(() => {
    setSelectedMessageId(messages[0]?.id ?? null)
  }, [contact.id])

  useEffect(() => {
    if (
      selectedMessageId !== null &&
      !messages.some((message) => message.id === selectedMessageId)
    ) {
      setSelectedMessageId(messages[0]?.id ?? null)
    }

    if (selectedMessageId === null && messages.length > 0) {
      setSelectedMessageId(messages[0].id)
    }
  }, [messages, selectedMessageId])

  const addMessage = () => {
    const message = createMessage(
      newMessageType,
      createUniqueMessageId(messages),
    )

    onAdd(message)
    setSelectedMessageId(message.id)
  }

  const deleteSelectedMessage = () => {
    if (!selectedMessage) {
      return
    }

    const selectedIndex = messages.findIndex(
      (message) => message.id === selectedMessage.id,
    )
    const nextSelectedMessage =
      messages[selectedIndex + 1] ?? messages[selectedIndex - 1]

    setSelectedMessageId(nextSelectedMessage?.id ?? null)
    onDelete(selectedMessage.id)
  }

  return (
    <section
      className="message-editor"
      aria-label={`${contact.name}的聊天记录编辑器`}
    >
      <header className="message-editor__header">
        <div className="message-editor__heading">
          <h2 className="message-editor__title">聊天记录</h2>
          <p className="message-editor__description">
            编辑 {contact.name} 的每一条消息，修改会立即显示在预览中。
          </p>
        </div>
        <Badge className="message-editor__count" variant="outline">
          {messages.length} 条
        </Badge>
      </header>

      <section
        className="message-editor__add"
        aria-label="新增聊天记录"
      >
        <Field className="message-editor__add-field">
          <FieldTitle
            className="message-editor__add-title"
            id={`${idPrefix}-new-type-label`}
          >
            新消息类型
          </FieldTitle>
          <ToggleGroup
            className="message-editor__add-toggle-group"
            aria-labelledby={`${idPrefix}-new-type-label`}
            spacing={1}
            value={[newMessageType]}
            variant="outline"
            onValueChange={(values) => {
              const nextType = values[0] as MessageType | undefined

              if (nextType) {
                setNewMessageType(nextType)
              }
            }}
          >
            {messageTypeOptions.map((option) => (
              <ToggleGroupItem
                className="message-editor__add-toggle-item"
                key={option.value}
                value={option.value}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Button
          className="message-editor__add-button"
          type="button"
          onClick={addMessage}
        >
          <PlusIcon data-icon="inline-start" />
          新增消息
        </Button>
      </section>

      <div className="message-editor__workspace">
        <aside
          className="message-editor__directory"
          aria-label="消息列表"
        >
          <header className="message-editor__directory-header">
            <FieldTitle className="message-editor__directory-title">
              消息列表
            </FieldTitle>
            <Badge
              className="message-editor__directory-count"
              variant="secondary"
            >
              {messages.length}
            </Badge>
          </header>

          {messages.length > 0 ? (
            <ScrollArea className="message-editor__directory-scroll">
              <div className="message-editor__list" role="list">
                {messages.map((message, index) => {
                  const isSelected = message.id === selectedMessage?.id

                  return (
                    <Button
                      className="message-editor__list-item"
                      aria-current={isSelected ? "true" : undefined}
                      data-selected={isSelected}
                      key={message.id}
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedMessageId(message.id)}
                    >
                      <span className="message-editor__list-index">
                        {index + 1}
                      </span>
                      <span className="message-editor__list-copy">
                        <span className="message-editor__list-heading">
                          <Badge
                            className="message-editor__list-type"
                            variant="secondary"
                          >
                            {messageTypeLabels[message.type]}
                          </Badge>
                          {message.time ? (
                            <span className="message-editor__list-time">
                              {message.time}
                            </span>
                          ) : null}
                        </span>
                        <span className="message-editor__list-summary">
                          {getMessageSummary(message)}
                        </span>
                      </span>
                    </Button>
                  )
                })}
              </div>
            </ScrollArea>
          ) : (
            <Empty className="message-editor__empty">
              <EmptyHeader className="message-editor__empty-header">
                <EmptyMedia
                  className="message-editor__empty-media"
                  variant="icon"
                >
                  <MessageSquareIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle className="message-editor__empty-title">
                  暂无聊天记录
                </EmptyTitle>
                <EmptyDescription className="message-editor__empty-description">
                  选择消息类型并新增第一条记录。
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="message-editor__empty-content">
                <Button type="button" size="sm" onClick={addMessage}>
                  <PlusIcon data-icon="inline-start" />
                  新增消息
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </aside>

        <section
          className="message-editor__detail"
          aria-label="消息详情"
        >
          {selectedMessage ? (
            <>
              <MessagePreview
                contact={contact}
                message={selectedMessage}
              />

              <ScrollArea className="message-editor__form-scroll">
                <MessageFields
                  idPrefix={`${idPrefix}-message`}
                  message={selectedMessage}
                  onUpdate={(nextMessage) =>
                    onUpdate(selectedMessage.id, nextMessage)
                  }
                />

                <footer className="message-editor__actions">
                  <AlertDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                  >
                    <AlertDialogTrigger
                      render={
                        <Button
                          className="message-editor__delete-button"
                          type="button"
                          variant="destructive"
                        />
                      }
                    >
                      <Trash2Icon data-icon="inline-start" />
                      删除消息
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          确定删除这条消息吗？
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          将从 {contact.name} 的聊天记录中永久删除“
                          {getMessageSummary(selectedMessage)}”，此操作无法撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            deleteSelectedMessage()
                            setDeleteDialogOpen(false)
                          }}
                        >
                          确认删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </footer>
              </ScrollArea>
            </>
          ) : (
            <Empty className="message-editor__empty">
              <EmptyHeader className="message-editor__empty-header">
                <EmptyMedia
                  className="message-editor__empty-media"
                  variant="icon"
                >
                  <MessageSquareIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle className="message-editor__empty-title">
                  请选择一条消息
                </EmptyTitle>
                <EmptyDescription className="message-editor__empty-description">
                  从左侧选择消息后即可查看、编辑或删除。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      </div>
    </section>
  )
}
