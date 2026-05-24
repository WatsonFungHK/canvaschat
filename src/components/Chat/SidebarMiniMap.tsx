import React, { useState, useRef } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Message } from "../../types";
import { cn } from "../../utils/cn";
import { motion, AnimatePresence } from "motion/react";

interface SidebarMiniMapProps {
  messages: Message[];
  messagePositions: Map<string, number>;
  onJumpToTop: () => void;
  onJumpToBottom: () => void;
  onMiniMapClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onPinClick: (id: string) => void;
}

export const SidebarMiniMap: React.FC<SidebarMiniMapProps> = ({
  messages,
  messagePositions,
  onJumpToTop,
  onJumpToBottom,
  onMiniMapClick,
  onPinClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTooltipData, setActiveTooltipData] = useState<{ text: string; top: number } | null>(null);

  const truncateText = (text: string) => {
    if (!text) return "";
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/);
    if (words.length > 20) {
      return words.slice(0, 18).join(" ") + "...";
    }
    if (trimmed.length > 70) {
      return trimmed.substring(0, 67) + "...";
    }
    return trimmed;
  };

  return (
    <div 
      ref={containerRef} 
      className="w-7 border-l border-gray-50 bg-gray-50/50 flex flex-col pt-4 pb-3 items-center gap-2 shrink-0 relative overflow-visible"
    >
      <button onClick={onJumpToTop} className="p-1 hover:bg-gray-200 rounded text-gray-400 transition-colors">
        <ArrowUp size={16} />
      </button>
      
      <div 
        className="flex-1 w-3 bg-gray-200/50 rounded-full relative overflow-visible my-2 border border-slate-200/20 shadow-inner cursor-pointer hover:bg-gray-300/40 transition-colors"
        onClick={onMiniMapClick}
      >
        {messages.map((m, i) => (
          <div 
            key={`msg-dot-${m.id}`}
            className={cn(
              "absolute w-full h-[1px] opacity-30 pointer-events-none",
              m.userId === 'user' ? "bg-blue-400" : "bg-gray-400"
            )}
            style={{ top: `${messagePositions.get(m.id) ?? (i / Math.max(1, messages.length - 1)) * 100}%` }}
          />
        ))}
        {messages.map((m, i) => m.isPinned && (
          <div 
            key={`pin-${m.id}`}
            className="absolute w-full h-[14px] flex items-center cursor-pointer group/pin z-10"
            style={{ 
              top: `${messagePositions.get(m.id) ?? (i / Math.max(1, messages.length - 1)) * 100}%`,
              transform: 'translateY(-50%)' 
            }}
            onClick={(e) => {
              e.stopPropagation();
              onPinClick(m.id);
            }}
            onMouseEnter={(e) => {
              const currentTarget = e.currentTarget;
              const rect = currentTarget.getBoundingClientRect();
              const parentContainer = containerRef.current;
              if (parentContainer) {
                const parentRect = parentContainer.getBoundingClientRect();
                const topOffset = rect.top - parentRect.top + rect.height / 2;
                setActiveTooltipData({
                  text: m.text,
                  top: topOffset,
                });
              }
            }}
            onMouseLeave={() => {
              setActiveTooltipData(null);
            }}
          >
            <div className="w-full h-[6px] bg-yellow-400 border-y border-yellow-500/20 shadow-sm rounded-sm" />
          </div>
        ))}
      </div>

      <button onClick={onJumpToBottom} className="p-1 hover:bg-gray-200 rounded text-gray-400 transition-colors">
        <ArrowDown size={16} />
      </button>

      {/* Floating Hover Tooltip overlay for previewing Pinned messages dynamically */}
      <AnimatePresence>
        {activeTooltipData && (
          <motion.div
            initial={{ opacity: 0, x: 8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute right-full mr-2.5 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl p-3 text-xs w-64 pointer-events-none select-none z-[9999]"
            style={{
              top: `${activeTooltipData.top}px`,
              transform: 'translateY(-50%)'
            }}
          >
            <p className="text-slate-700 font-sans font-medium break-words text-[11px] leading-relaxed">
              {truncateText(activeTooltipData.text)}
            </p>
            {/* Sleek triangular cursor indicator pointing directly to the scrollbar marker row */}
            <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-0 h-0 border-y-[5px] border-y-transparent border-l-[6px] border-l-slate-200/80" />
            <div className="absolute top-1/2 -translate-y-1/2 -right-[3px] w-0 h-0 border-y-[4px] border-y-transparent border-l-[5px] border-l-white/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
