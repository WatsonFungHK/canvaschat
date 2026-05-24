import React, { useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  X,
  Menu
} from "lucide-react";
import { Message, MatchLocation } from "../../types";
import { cn } from "../../utils/cn";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { SidebarMiniMap } from "./SidebarMiniMap";

interface Props {
  width: number;
  isCollapsed: boolean;
  messages: Message[];
  inputText: string;
  isAiTyping: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  onWidthChange: (width: number) => void;
  onSendMessage: () => void;
  onInputTextChange: (text: string) => void;
  onTogglePin: (id: string) => void;
  onAddElement: (text: string) => void;
  activeDraggingId?: string | null;
  onLinkMessage?: (textboxId: string, messageId: string, messageText: string) => void;
  attachedCards?: { id: string; text: string }[];
  onRemoveAttachedCard?: (id: string) => void;
}

const findMatches = (
  messages: Message[],
  term: string,
  options: { matchCase: boolean; wholeWord: boolean; useRegex: boolean }
): MatchLocation[] => {
  if (!term) return [];

  const locations: MatchLocation[] = [];
  let globalCount = 0;

  let regex: RegExp;
  try {
    let pattern = term;
    if (!options.useRegex) {
      pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (options.wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    const flags = options.matchCase ? 'g' : 'gi';
    regex = new RegExp(pattern, flags);
  } catch (err) {
    try {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escaped, options.matchCase ? 'g' : 'gi');
    } catch (_) {
      return [];
    }
  }

  messages.forEach((msg) => {
    const text = msg.text || "";
    let indexInMsg = 0;
    let match;
    regex.lastIndex = 0;
    
    while ((match = regex.exec(text)) !== null) {
      globalCount++;
      locations.push({
        messageId: msg.id,
        globalIndex: globalCount,
        indexInMessage: indexInMsg
      });
      indexInMsg++;
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }
  });

  return locations;
};

export const ChatSidebar: React.FC<Props> = ({
  width,
  isCollapsed,
  messages,
  inputText,
  isAiTyping,
  onToggleCollapse,
  onWidthChange,
  onSendMessage,
  onInputTextChange,
  onTogglePin,
  onAddElement,
  activeDraggingId,
  onLinkMessage,
  attachedCards = [],
  onRemoveAttachedCard
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // New Find/Search widget states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(1);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Precalculate search matches
  const globalMatches = useMemo(() => {
    return findMatches(messages, searchTerm, { matchCase, wholeWord, useRegex });
  }, [messages, searchTerm, matchCase, wholeWord, useRegex]);

  // Adjust active match bounds
  useEffect(() => {
    if (globalMatches.length > 0) {
      if (activeMatchIndex < 1 || activeMatchIndex > globalMatches.length) {
        setActiveMatchIndex(1);
      }
    } else {
      setActiveMatchIndex(0);
    }
  }, [globalMatches, activeMatchIndex]);

  // Autofocus input when opened
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isSearchOpen]);

  // Safe scroll element helper
  const scrollToMatchNode = (index: number) => {
    if (index < 1) return;
    setTimeout(() => {
      const matchEl = document.getElementById(`chat-match-${index}`);
      if (matchEl) {
        matchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  useEffect(() => {
    if (activeMatchIndex > 0) {
      scrollToMatchNode(activeMatchIndex);
    }
  }, [activeMatchIndex]);

  // Control shortcuts (Ctrl+F, Escape)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        if (!isCollapsed) {
          e.preventDefault();
          setIsSearchOpen(prev => !prev);
        }
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isCollapsed, isSearchOpen]);

  // Move to next/prev with Enter / Shift+Enter inside search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (globalMatches.length > 0) {
        if (e.shiftKey) {
          setActiveMatchIndex(prev => prev <= 1 ? globalMatches.length : prev - 1);
        } else {
          setActiveMatchIndex(prev => prev >= globalMatches.length ? 1 : prev + 1);
        }
      }
    }
  };

  const scrollToBottom = (force = false) => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    if (force || isAtBottom) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!isCollapsed) {
      setTimeout(() => scrollToBottom(true), 150);
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(messages[messages.length - 1].userId === 'user');
    }
  }, [messages]);

  useEffect(() => {
    if (isAiTyping) scrollToBottom(true);
  }, [isAiTyping]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth < 100) {
        onToggleCollapse(true);
        onWidthChange(48);
      } else {
        onToggleCollapse(false);
        onWidthChange(Math.min(600, Math.max(120, newWidth)));
      }
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onToggleCollapse, onWidthChange]);

  const startResizing = () => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
  };

  const jumpToTop = () => chatContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const jumpToBottom = () => chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });

  const [messagePositions, setMessagePositions] = React.useState<Map<string, number>>(new Map());

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!chatContainerRef.current) return;
      const container = chatContainerRef.current;
      const scrollHeight = container.scrollHeight;
      if (scrollHeight === 0) return;

      const newPositions = new Map<string, number>();
      messages.forEach((msg) => {
        const el = document.getElementById(`chat-msg-${msg.id}`);
        if (el) {
          const pos = (el.offsetTop / scrollHeight) * 100;
          newPositions.set(msg.id, pos);
        }
      });
      setMessagePositions(newPositions);
    }, 300);
    return () => clearTimeout(timer);
  }, [messages, width, isCollapsed]);

  const scrollToMessage = (id: string) => {
    const element = document.getElementById(`chat-msg-${id}`);
    const container = chatContainerRef.current;
    if (element && container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
      
      container.scrollTo({
        top: Math.max(0, relativeTop - 4),
        behavior: 'smooth'
      });
    }
  };

  const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chatContainerRef.current) return;
    if (e.target !== e.currentTarget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = y / rect.height;
    
    const scrollHeight = chatContainerRef.current.scrollHeight;
    const clientHeight = chatContainerRef.current.clientHeight;
    const scrollAmount = percentage * (scrollHeight - clientHeight);
    
    chatContainerRef.current.scrollTo({
      top: scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="flex h-full relative" style={{ zIndex: 50 }}>
      {!isCollapsed && (
        <div 
          className="w-1 cursor-col-resize hover:bg-blue-400/50 transition-colors z-20 flex items-center justify-center -ml-0.5 absolute left-0 h-full"
          onMouseDown={startResizing}
        >
          <div className="h-8 w-1 bg-gray-300 rounded-full" />
        </div>
      )}

      <motion.div 
        animate={{ width }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "h-full bg-white border-l border-gray-200 flex flex-col relative overflow-hidden",
          isCollapsed ? "shadow-none" : "shadow-xl"
        )}
      >
        {isCollapsed ? (
          <div 
            onClick={() => {
              onToggleCollapse(false);
              onWidthChange(420);
            }}
            className="flex flex-col items-center h-full bg-slate-50/70 hover:bg-slate-100/95 transition-all duration-300 w-full overflow-hidden cursor-pointer group select-none relative"
            title="Expand Chat"
          >
            <div className="absolute top-4 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
               <MessageSquare size={16} />
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-10">
              <div className="p-1.5 bg-white rounded-full shadow-md border border-slate-200/60 group-hover:scale-110 group-hover:border-slate-300 active:scale-95 transition-all duration-300 flex items-center justify-center">
                <ChevronLeft size={16} className="text-slate-500 group-hover:text-indigo-600 transition-colors" />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 [writing-mode:vertical-lr] select-none">
                Expand
              </span>
            </div>

            <div className="absolute bottom-4 w-1 h-8 bg-slate-200 group-hover:bg-indigo-300 rounded-full transition-colors duration-300" />
          </div>
        ) : (
          <div className="flex flex-col h-full w-full min-w-[200px]">
            <ChatHeader 
              onCollapse={() => {
                onToggleCollapse(true);
                onWidthChange(48);
              }} 
              isSearchOpen={isSearchOpen}
              onToggleSearch={() => setIsSearchOpen(prev => !prev)}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              searchInputRef={searchInputRef}
              handleSearchKeyPress={handleSearchKeyPress}
              globalMatches={globalMatches}
              activeMatchIndex={activeMatchIndex}
              setActiveMatchIndex={setActiveMatchIndex}
            />

            <div className="flex-1 min-h-0 relative flex overflow-hidden">
              <MessageList 
                messages={messages} 
                isAiTyping={isAiTyping} 
                onTogglePin={onTogglePin} 
                onAddElement={onAddElement}
                chatContainerRef={chatContainerRef} 
                chatEndRef={chatEndRef}
                searchTerm={searchTerm}
                searchOptions={{ matchCase, wholeWord, useRegex }}
                activeMatchIndex={activeMatchIndex}
                globalMatches={globalMatches}
                activeDraggingId={activeDraggingId}
                onLinkMessage={onLinkMessage}
              />

              <SidebarMiniMap 
                messages={messages} 
                messagePositions={messagePositions} 
                onJumpToTop={jumpToTop} 
                onJumpToBottom={jumpToBottom} 
                onMiniMapClick={handleMiniMapClick} 
                onPinClick={scrollToMessage} 
              />
            </div>

            <ChatInput 
              value={inputText} 
              onChange={onInputTextChange} 
              onSend={onSendMessage} 
              disabled={isAiTyping} 
              attachedCards={attachedCards}
              onRemoveAttachedCard={onRemoveAttachedCard}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};

