import {
  ChevronDownIcon,
  Clock3Icon,
  FileIcon,
  ImageIcon,
  MicIcon,
  ScissorsIcon,
  SendHorizontalIcon,
  SmartphoneIcon,
  SmileIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import { Marker, MarkerContent } from "@/components/ui/marker";
import {
  Message as MessageRow,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Separator } from "@/components/ui/separator";
import {
  ContactAvatarImage,
  QQAvatarImage,
} from "@/components/ResolvedAvatarImage";
import { ImageMessageAttachment } from "@/components/ImageMessageAttachment";
import {
  QQArrowDownMiniIcon,
  QQComputerPhoneIcon,
  QQMoreIcon,
  QQNewDialogueIcon,
  QQPhoneIcon,
  QQShareScreenIcon,
  QQVideoIcon,
} from "@/components/QQToolbarIcons";
import type { Contact, Message as ChatMessage } from "@/types/chat";

const currentUser = {
  name: "Samuel",
  qq: 1902141259,
};

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "QQ";
}

type MarkerMessage = Extract<
  ChatMessage,
  { type: "date" | "recall" | "system" }
>;

function MessageMarker({ message }: { message: MarkerMessage }) {
  if (message.type === "date") {
    return (
      <Marker className="chat-marker chat-marker--date">
        <MarkerContent>{message.content}</MarkerContent>
      </Marker>
    );
  }

  return (
    <Marker className="chat-marker chat-marker--system">
      <MarkerContent>
        {message.type === "system" && message.actionLabel && (
          <span className="chat-marker__action">{message.actionLabel}</span>
        )}
        {message.content}
      </MarkerContent>
    </Marker>
  );
}

function ChatMessageRow({
  contact,
  message,
}: {
  contact: Contact;
  message: ChatMessage;
}) {
  if (
    message.type === "date" ||
    message.type === "recall" ||
    message.type === "system"
  ) {
    return <MessageMarker message={message} />;
  }

  const outgoing = message.direction === "outgoing";
  const senderName = outgoing ? currentUser.name : contact.name;

  return (
    <MessageRow
      align={outgoing ? "end" : "start"}
      aria-label={`${senderName}在${message.time ?? "未知时间"}发送的消息`}
      className="chat-message"
    >
      <MessageAvatar className="chat-message__avatar-slot">
        <Avatar className="chat-message__avatar" size="lg">
          {outgoing ? (
            <QQAvatarImage
              alt={`${senderName}的头像`}
              qq={currentUser.qq}
              size={100}
            />
          ) : (
            <ContactAvatarImage
              alt={`${senderName}的头像`}
              contact={contact}
              size={100}
            />
          )}
          <AvatarFallback>{initials(senderName)}</AvatarFallback>
        </Avatar>
      </MessageAvatar>

      <MessageContent className="chat-message__content">
        {message.type === "text" ? (
          <Bubble
            align={outgoing ? "end" : "start"}
            variant={outgoing ? "tinted" : "secondary"}
          >
            <BubbleContent>{message.content}</BubbleContent>
          </Bubble>
        ) : (
          <ImageMessageAttachment
            className="chat-image-attachment"
            message={message}
          />
        )}
      </MessageContent>
    </MessageRow>
  );
}

function StaticComposer() {
  const tools = [
    { label: "表情", icon: SmileIcon },
    { label: "截图", icon: ScissorsIcon },
    { label: "发送文件", icon: FileIcon },
    { label: "发送图片", icon: ImageIcon },
    { label: "手机传输", icon: SmartphoneIcon },
    { label: "语音消息", icon: MicIcon },
  ];

  return (
    <section className="composer" aria-label="消息输入区（仅展示）">
      <div className="composer__toolbar">
        <div className="composer__tools">
          {tools.map(({ icon: Icon, label }) => (
            <Button
              aria-label={label}
              className="composer__tool"
              key={label}
              size="icon-lg"
              variant="ghost"
            >
              <Icon />
            </Button>
          ))}
        </div>
        <Button
          aria-label="聊天记录"
          className="composer__tool"
          size="icon-lg"
          variant="ghost"
        >
          <Clock3Icon />
        </Button>
      </div>

      <div className="composer__canvas" aria-hidden="true">
        <span className="composer__caret" />
      </div>

      <ButtonGroup aria-label="发送消息" className="composer__send">
        <Button disabled>
          <SendHorizontalIcon data-icon="inline-start" />
          发送
        </Button>
        <ButtonGroupSeparator />
        <Button aria-label="发送选项" disabled size="icon">
          <ChevronDownIcon />
        </Button>
      </ButtonGroup>
    </section>
  );
}

type ChatPaneProps = {
  contact: Contact;
  isSelf?: boolean;
  messages: ChatMessage[];
};

export function ChatPane({
  contact,
  isSelf = false,
  messages,
}: ChatPaneProps) {
  return (
    <main className="chat-pane">
      <header className="chat-header">
        <div className="chat-header__identity">
          <h1>{contact.name}</h1>
          {contact.online && (
            <span aria-label="在线" className="online-dot" role="img" />
          )}
        </div>
        <div className="chat-header__actions">
          {!isSelf && (
            <>
              <Button
                aria-label="语音通话"
                className="chat-header__action"
                size="icon-lg"
                variant="ghost"
              >
                <QQPhoneIcon data-icon="inline-start" />
              </Button>
              <Button
                aria-label="视频通话"
                className="chat-header__action"
                size="icon-lg"
                variant="ghost"
              >
                <QQVideoIcon data-icon="inline-start" />
              </Button>
              <Button
                aria-label="共享屏幕"
                className="chat-header__action"
                size="icon-lg"
                variant="ghost"
              >
                <QQShareScreenIcon data-icon="inline-start" />
              </Button>
              <ButtonGroup
                aria-label="设备连接选项"
                className="chat-header__device-group"
              >
                <Button
                  aria-label="连接设备"
                  className="chat-header__device-main"
                  size="icon-lg"
                  variant="ghost"
                >
                  <QQComputerPhoneIcon data-icon="inline-start" />
                </Button>
                <Button
                  aria-label="展开设备选项"
                  className="chat-header__device-menu"
                  size="icon-sm"
                  variant="ghost"
                >
                  <QQArrowDownMiniIcon data-icon="inline-start" />
                </Button>
              </ButtonGroup>
            </>
          )}
          <Button
            aria-label="新建会话"
            className="chat-header__action"
            size="icon-lg"
            variant="ghost"
          >
            <QQNewDialogueIcon data-icon="inline-start" />
          </Button>
          <Button
            aria-label="更多"
            className="chat-header__action"
            size="icon-lg"
            variant="ghost"
          >
            <QQMoreIcon data-icon="inline-start" />
          </Button>
        </div>
      </header>

      <Separator />

      <section className="chat-timeline" aria-label={`与${contact.name}的聊天记录`}>
        <MessageScrollerProvider autoScroll>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent className="chat-timeline__content">
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={
                      "direction" in message &&
                      message.direction === "outgoing"
                    }
                  >
                    <ChatMessageRow contact={contact} message={message} />
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </section>

      <Separator />
      <StaticComposer />
    </main>
  );
}
