import { useMemo, useState } from "react";
import { BellOffIcon, PlusIcon, SearchIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ContactAvatarImage } from "@/components/ResolvedAvatarImage";
import type { Contact } from "@/types/chat";
import { cn } from "@/lib/utils";

type ConversationSidebarProps = {
  contacts: Contact[];
  selectedId: string;
  onSelect: (id: string) => void;
};

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "QQ";
}

export function ConversationSidebar({
  contacts,
  selectedId,
  onSelect,
}: ConversationSidebarProps) {
  const [query, setQuery] = useState("");
  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    if (!normalizedQuery) return contacts;

    return contacts.filter((contact) =>
      [contact.name, contact.qq, contact.lastMessage].some((value) =>
        value.toLocaleLowerCase("zh-CN").includes(normalizedQuery),
      ),
    );
  }, [contacts, query]);

  return (
    <aside className="conversation-sidebar" aria-label="会话列表">
      <div className="conversation-sidebar__search">
        <InputGroup className="conversation-search">
          <InputGroupInput
            aria-label="搜索会话"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="搜索"
            value={query}
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
        <Button
          aria-label="新建会话"
          className="conversation-add"
          size="icon-lg"
          variant="ghost"
        >
          <PlusIcon />
        </Button>
      </div>

      <ScrollArea className="conversation-sidebar__scroll">
        <div className="conversation-list">
          {filteredContacts.map((contact) => {
            const selected = contact.id === selectedId;

            return (
              <Button
                aria-pressed={selected}
                className={cn(
                  "conversation-item",
                  selected && "is-selected",
                )}
                key={contact.id}
                onClick={() => onSelect(contact.id)}
                variant="ghost"
              >
                <Avatar className="conversation-item__avatar" size="lg">
                  <ContactAvatarImage
                    alt={`${contact.name}的头像`}
                    contact={contact}
                    size={100}
                  />
                  <AvatarFallback>{initials(contact.name)}</AvatarFallback>
                </Avatar>

                <span className="conversation-item__body">
                  <span className="conversation-item__topline">
                    <span className="conversation-item__name">
                      {contact.name}
                    </span>
                    <span className="conversation-item__time">
                      {contact.timeLabel}
                    </span>
                  </span>
                  <span className="conversation-item__bottomline">
                    <span className="conversation-item__preview">
                      {contact.lastMessage}
                    </span>
                    <span className="conversation-item__status">
                      {contact.unreadCount > 0 && (
                        <Badge
                          className="conversation-item__badge"
                          data-muted={contact.muted || undefined}
                          variant={contact.muted ? "secondary" : "destructive"}
                        >
                          {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                        </Badge>
                      )}
                      {contact.unreadCount === 0 && contact.muted && (
                        <BellOffIcon
                          aria-label="已开启消息免打扰"
                          className="size-4"
                        />
                      )}
                    </span>
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
