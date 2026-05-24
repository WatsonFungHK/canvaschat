import React, { useState, useRef, useEffect, useMemo } from "react";
import { Pin, GripVertical, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Message, MatchLocation } from "../../types";
import { cn } from "../../utils/cn";

interface MessageItemProps {
  msg: Message;
  isUser: boolean;
  onTogglePin: (id: string) => void;
  onAddElement: (text: string) => void;
  searchTerm?: string;
  searchOptions?: { matchCase: boolean; wholeWord: boolean; useRegex: boolean };
  activeMatchIndex?: number;
  messageMatches?: MatchLocation[];
  activeDraggingId?: string | null;
  onLinkMessage?: (textboxId: string, messageId: string, messageText: string) => void;
}

// Helper to map selected plain text back to the original raw Markdown text with syntax preserved
function getMarkdownSelection(raw: string, selectedText: string): string {
  const cleanSelected = selectedText.trim();
  if (!cleanSelected) return selectedText;

  let plain = "";
  const map: number[] = [];

  let j = 0;
  while (j < raw.length) {
    // 1. Skip HTML tags (e.g. injected search highlight spans or standard HTML)
    if (raw[j] === '<') {
      let tagEnd = raw.indexOf('>', j);
      if (tagEnd !== -1) {
        j = tagEnd + 1;
        continue;
      }
    }

    // 2. Skip list marker bullets/numbers, headers formatting at start of lines
    const isStartOfLine = j === 0 || raw[j - 1] === '\n';
    if (isStartOfLine) {
      if ((raw[j] === '-' || raw[j] === '*' || raw[j] === '+') && raw[j + 1] === ' ') {
        j += 2;
        continue;
      }
      let numMatch = raw.slice(j).match(/^\d+\.\s+/);
      if (numMatch) {
        j += numMatch[0].length;
        continue;
      }
    }

    const char = raw[j];

    // 3. Skip Markdown markdown symbols * _ ~ `
    if (char === '*' || char === '_' || char === '~' || char === '`') {
      j++;
      continue;
    }

    // 4. Skip bracket elements of links
    if (char === '[') {
      j++;
      continue;
    }
    if (char === ']' && raw[j + 1] === '(') {
      let closeParen = raw.indexOf(')', j + 2);
      if (closeParen !== -1) {
        j = closeParen + 1;
        continue;
      }
    }

    plain += char;
    map.push(j);
    j++;
  }

  // Find occurrences in the constructed plain text representation
  let startIndex = plain.indexOf(cleanSelected);

  // Fallback 1: Try case-insensitive matching
  if (startIndex === -1) {
    startIndex = plain.toLowerCase().indexOf(cleanSelected.toLowerCase());
  }

  // Fallback 2: If browser selection collapses/normalizes multiple spaces or line breaks, normalize them to match
  if (startIndex === -1) {
    const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    const normalizedSelected = normalize(cleanSelected);

    // Find by words sliding window
    const tokens = cleanSelected.split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      const firstToken = tokens[0].toLowerCase();
      const lastToken = tokens[tokens.length - 1].toLowerCase();

      let bestStart = -1;
      let bestEnd = -1;

      let searchIdx = 0;
      while ((searchIdx = plain.toLowerCase().indexOf(firstToken, searchIdx)) !== -1) {
        const endSearchIdx = plain.toLowerCase().indexOf(lastToken, searchIdx + firstToken.length);
        if (endSearchIdx !== -1) {
          const plainSlice = plain.substring(searchIdx, endSearchIdx + lastToken.length);
          if (Math.abs(normalize(plainSlice).length - normalizedSelected.length) < 10) {
            bestStart = searchIdx;
            bestEnd = endSearchIdx + lastToken.length - 1;
            break;
          }
        }
        searchIdx++;
      }

      if (bestStart !== -1 && bestEnd !== -1) {
        const rawStart = map[bestStart];
        const rawEnd = map[bestEnd];
        if (rawStart !== undefined && rawEnd !== undefined && rawEnd >= rawStart) {
          return raw.substring(rawStart, rawEnd + 1);
        }
      }
    }
  }

  if (startIndex !== -1) {
    const endIndex = startIndex + cleanSelected.length - 1;
    const rawStartIndex = map[startIndex];
    const rawEndIndex = map[endIndex];
    if (rawStartIndex !== undefined && rawEndIndex !== undefined && rawEndIndex >= rawStartIndex) {
      return raw.substring(rawStartIndex, rawEndIndex + 1);
    }
  }

  return selectedText;
}

export const MessageItem: React.FC<MessageItemProps> = ({ 
  msg, 
  isUser, 
  onTogglePin, 
  onAddElement,
  searchTerm,
  searchOptions,
  activeMatchIndex,
  messageMatches,
  activeDraggingId,
  onLinkMessage
}) => {
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, text: string } | null>(null);
  const [isDragOverForLink, setIsDragOverForLink] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handleDragOverLink = (e: React.DragEvent) => {
    // Standard HTML5 types may uppercase or vary, but checking includes matches nicely
    if (e.dataTransfer.types.includes("application/react-textbox-id")) {
      e.preventDefault();
      setIsDragOverForLink(true);
    }
  };

  const handleDragLeaveLink = () => {
    setIsDragOverForLink(false);
  };

  const handleDropLink = (e: React.DragEvent) => {
    const textboxId = e.dataTransfer.getData("application/react-textbox-id");
    if (textboxId && onLinkMessage) {
      e.preventDefault();
      setIsDragOverForLink(false);
      onLinkMessage(textboxId, msg.id, msg.text);
    }
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Position above the selection
      setSelectionMenu({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        text: selection.toString().trim()
      });
    } else {
      setSelectionMenu(null);
    }
  };

  const onCreateFromSelection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectionMenu) {
      const markdownText = getMarkdownSelection(msg.text, selectionMenu.text);
      onAddElement(markdownText);
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      // Close if clicking outside the menu
      const menuEl = document.getElementById('selection-popover');
      if (menuEl && !menuEl.contains(e.target as Node)) {
        setSelectionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleGlobalMouseDown);
    return () => document.removeEventListener('mousedown', handleGlobalMouseDown);
  }, []);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", msg.text);
    e.dataTransfer.setData("application/react-message-id", msg.id);
    e.dataTransfer.setData("application/react-message-text", msg.text);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div 
      id={`chat-msg-${msg.id}`}
      className={cn("group flex flex-col", isUser ? "items-end" : "items-start")}
    >
      <div className="flex items-center gap-2 mb-1 px-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{msg.userName}</span>
        {msg.isPinned && <Pin size={10} className="text-yellow-500 fill-yellow-500" />}
      </div>
      <div 
        ref={bubbleRef}
        onMouseUp={handleMouseUp}
        onDragOver={handleDragOverLink}
        onDragLeave={handleDragLeaveLink}
        onDrop={handleDropLink}
        className={cn(
          "max-w-[90%] px-4 py-2 rounded-2xl text-sm relative transition-all duration-150 select-text",
          isUser ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-md" : "bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200/50",
          msg.isPinned && "ring-2 ring-yellow-400/50",
          activeDraggingId && "border-2 border-dashed border-blue-400 cursor-copy animate-pulse bg-blue-50/20",
          isDragOverForLink && (isUser ? "ring-4 ring-blue-300 scale-[1.01]" : "ring-4 ring-blue-300 bg-blue-50/80 border-blue-400 scale-[1.01]")
        )}
      >
        {/* Drag Handle */}
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600",
            isUser ? "-left-6" : "-right-6"
          )}
          draggable
          onDragStart={handleDragStart}
        >
          <GripVertical size={16} />
        </div>

        <div className={cn(
          "prose prose-sm max-w-none select-text",
          isUser ? "prose-invert text-white [&_*]:text-white [&_strong]:text-indigo-100 [&_a]:text-indigo-200" : "text-gray-800"
        )}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              table: ({ ...props }) => (
                <div className="w-full overflow-x-auto my-4 last:mb-0 scrollbar-thin scrollbar-thumb-gray-200">
                  <table {...props} className="min-w-full border-collapse" />
                </div>
              ),
              pre: ({ ...props }) => (
                <div className="w-full overflow-x-auto my-4 rounded-lg">
                  <pre {...props} />
                </div>
              )
            }}
          >
            {useMemo(() => {
              if (!searchTerm || !messageMatches || messageMatches.length === 0 || !searchOptions) {
                return msg.text;
              }

              let regex: RegExp;
              try {
                let pattern = searchTerm;
                if (!searchOptions.useRegex) {
                  pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                }
                if (searchOptions.wholeWord) {
                  pattern = `\\b${pattern}\\b`;
                }
                const flags = searchOptions.matchCase ? 'g' : 'gi';
                regex = new RegExp(pattern, flags);
              } catch (err) {
                try {
                  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  regex = new RegExp(escaped, searchOptions.matchCase ? 'g' : 'gi');
                } catch (_) {
                  return msg.text;
                }
              }

              let matchIndex = 0;
              regex.lastIndex = 0;

              return msg.text.replace(regex, (match) => {
                const loc = messageMatches[matchIndex];
                if (!loc) return match;
                matchIndex++;

                const globalIdx = loc.globalIndex;
                const isActive = globalIdx === activeMatchIndex;

                const highlightClass = isActive
                  ? "bg-amber-500 text-slate-900 font-semibold px-0.5 rounded shadow border-b border-amber-600 outline-none inline shrink-0 transition-all"
                  : "bg-yellow-200 text-slate-800 px-0.5 rounded inline transition-colors";

                return `<span id="chat-match-${globalIdx}" class="${highlightClass}">${match}</span>`;
              });
            }, [msg.text, searchTerm, searchOptions, messageMatches, activeMatchIndex])}
          </ReactMarkdown>
        </div>
        <button 
          onClick={() => onTogglePin(msg.id)}
          className={cn(
            "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white shadow-md border border-gray-100 rounded-full z-10",
            isUser ? "-left-12" : "-right-12"
          )}
        >
          <Pin size={12} className={cn(msg.isPinned ? "text-yellow-500" : "text-gray-300")} />
        </button>
      </div>

      {selectionMenu && (
        <div 
          id="selection-popover"
          className="fixed z-[9999] -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in duration-200"
          style={{ top: selectionMenu.y, left: selectionMenu.x }}
        >
          <button 
            onMouseDown={(e) => e.preventDefault()} // Prevent losing selection before click
            onClick={onCreateFromSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-xl hover:bg-slate-800 transition-colors border border-slate-700/50"
          >
            <Plus size={12} className="text-blue-400" />
            Create Text Box
          </button>
          <div className="w-2 h-2 bg-slate-900 absolute left-1/2 -bottom-1 -translate-x-1/2 rotate-45 border-r border-b border-slate-700/50" />
        </div>
      )}
    </div>
  );
};
