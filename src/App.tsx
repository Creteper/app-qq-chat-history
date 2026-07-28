import { useMemo, useState } from "react";

import "./App.css";

import { ChatPane } from "@/components/ChatPane";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import {
  PrimaryNavigation,
  type AppView,
} from "@/components/PrimaryNavigation";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WindowTitlebar } from "@/components/WindowTitlebar";
import { DEFAULT_SELECTED_CONTACT_ID } from "@/data/chat-data";
import { useContactStore } from "@/hooks/use-contact-store";
import { useMessageStore } from "@/hooks/use-message-store";
import { useQQAvatar } from "@/hooks/use-qq-avatar";
import { cn } from "@/lib/utils";

const currentUser = {
  qq: 1902141259,
  name: "Samuel",
  signature: "编辑个性签名",
};

function App() {
  const { contacts, resetContacts, updateContact } = useContactStore();
  const {
    addMessage,
    deleteMessage,
    messages,
    resetMessages,
    updateMessage,
  } = useMessageStore();
  const [view, setView] = useState<AppView>("chat");
  const [selectedId, setSelectedId] = useState(
    DEFAULT_SELECTED_CONTACT_ID,
  );
  const [maximized, setMaximized] = useState(false);
  const currentUserAvatar = useQQAvatar(currentUser.qq, 100);
  const messageUnreadCount = useMemo(
    () =>
      contacts.reduce(
        (total, contact) => total + Math.max(0, contact.unreadCount),
        0,
      ),
    [contacts],
  );

  const selectedContact = useMemo(
    () =>
      contacts.find((contact) => contact.id === selectedId) ?? contacts[0],
    [contacts, selectedId],
  );

  if (!selectedContact) {
    return null;
  }

  const resetAllData = () => {
    resetContacts();
    resetMessages();
  };

  return (
    <TooltipProvider delay={300}>
      <div className={cn("app-shell", maximized && "is-maximized")}>
        <WindowTitlebar
          avatarUrl={currentUserAvatar}
          displayName={currentUser.name}
          onMaximizedChange={setMaximized}
          signature={currentUser.signature}
        />

        <div className="app-surface">
          <PrimaryNavigation
            messageUnreadCount={messageUnreadCount}
            onViewChange={setView}
            view={view}
          />

          {view === "chat" ? (
            <>
              <ConversationSidebar
                contacts={contacts}
                onSelect={setSelectedId}
                selectedId={selectedContact.id}
              />
              <ChatPane
                contact={selectedContact}
                isSelf={selectedContact.id === DEFAULT_SELECTED_CONTACT_ID}
                messages={messages[selectedContact.id] ?? []}
              />
            </>
          ) : (
            <SettingsPanel
              contacts={contacts}
              messages={messages[selectedContact.id] ?? []}
              onAddMessage={addMessage}
              onChange={updateContact}
              onDeleteMessage={deleteMessage}
              onReset={resetAllData}
              onSelect={setSelectedId}
              onUpdateMessage={updateMessage}
              selectedId={selectedContact.id}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
