import React from "react";
import { Loader2 } from "lucide-react";
import { Message, MatchLocation } from "../../types";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: Message[];
  isAiTyping: boolean;
  onTogglePin: (id: string) => void;
  onAddElement: (text: string) => void;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  searchTerm?: string;
  searchOptions?: { matchCase: boolean; wholeWord: boolean; useRegex: boolean };
  activeMatchIndex?: number;
  globalMatches?: MatchLocation[];
  activeDraggingId?: string | null;
  onLinkMessage?: (textboxId: string, messageId: string, messageText: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isAiTyping,
  onTogglePin,
  onAddElement,
  chatContainerRef,
  chatEndRef,
  searchTerm,
  searchOptions,
  activeMatchIndex,
  globalMatches,
  activeDraggingId,
  onLinkMessage
}) => {
  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto scrollbar-none px-4 pb-6 pt-4 space-y-5 scroll-smooth relative"
    >
      {messages.map((msg) => {
        const messageMatches = globalMatches?.filter(m => m.messageId === msg.id) || [];
        return (
          <MessageItem 
            key={msg.id} 
            msg={msg} 
            isUser={msg.userId === 'user'} 
            onTogglePin={onTogglePin} 
            onAddElement={onAddElement}
            searchTerm={searchTerm}
            searchOptions={searchOptions}
            activeMatchIndex={activeMatchIndex}
            messageMatches={messageMatches}
            activeDraggingId={activeDraggingId}
            onLinkMessage={onLinkMessage}
          />
        );
      })}
      {isAiTyping && (
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assistant</span>
          </div>
          <div className="bg-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm border border-gray-200/50">
            <Loader2 size={16} className="animate-spin text-blue-600" />
            <span className="text-xs text-gray-400 font-medium tracking-tight">Assistant is thinking...</span>
          </div>
        </div>
      )}
      <div ref={chatEndRef} />
    </div>
  );
};
