import React from "react";
import { Send, X } from "lucide-react";

interface AttachedCard {
  id: string;
  text: string;
}

interface ChatInputProps {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  disabled: boolean;
  attachedCards?: AttachedCard[];
  onRemoveAttachedCard?: (id: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled,
  attachedCards = [],
  onRemoveAttachedCard
}) => {
  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
      {attachedCards.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5 max-h-24 overflow-y-auto">
          {attachedCards.map((card) => {
            const cleanText = (card.text || "").trim();
            const displaySnippet = cleanText.length > 30 
              ? cleanText.substring(0, 27) + "..." 
              : cleanText || "(Empty Memo)";
            return (
              <div 
                key={card.id} 
                className="flex items-center gap-1.5 bg-indigo-55/80 bg-slate-100/80 border border-indigo-200/50 px-2 flex-nowrap py-0.5 rounded-full text-xs text-indigo-700 animate-in fade-in slide-in-from-bottom-2 duration-150 shadow-sm"
              >
                <span className="font-semibold text-[10px] tracking-wide text-indigo-550 select-none">CONTEXT:</span>
                <span className="truncate max-w-[140px] font-mono text-slate-700">{displaySnippet}</span>
                <button 
                  type="button" 
                  onClick={() => onRemoveAttachedCard?.(card.id)}
                  className="p-0.5 hover:bg-indigo-100 text-indigo-500 hover:text-indigo-800 rounded-full transition-colors cursor-pointer shrink-0"
                  title="Remove context attachment"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-2 bg-slate-50/80 p-1.5 pl-4 rounded-2xl border border-slate-200/60 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <input 
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (value.trim() || attachedCards.length > 0) && !disabled) {
              onSend();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-none outline-none text-sm py-1 placeholder:text-gray-400"
        />
        <button 
          onClick={onSend}
          disabled={(!value.trim() && attachedCards.length === 0) || disabled}
          className="bg-blue-600 text-white p-2 rounded-xl disabled:opacity-50 disabled:grayscale transition-all shadow-md hover:shadow-blue-200 active:scale-95 flex items-center justify-center shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
