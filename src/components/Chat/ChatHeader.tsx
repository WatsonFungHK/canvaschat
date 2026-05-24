import React from "react";
import { ChevronRight, Search, X, ArrowUp, ArrowDown, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatHeaderProps {
  onCollapse: () => void;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  handleSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  globalMatches: any[];
  activeMatchIndex: number;
  setActiveMatchIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onCollapse,
  isSearchOpen,
  onToggleSearch,
  searchTerm,
  setSearchTerm,
  searchInputRef,
  handleSearchKeyPress,
  globalMatches,
  activeMatchIndex,
  setActiveMatchIndex,
}) => {
  return (
    <div className="px-3.5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 relative overflow-hidden h-14">
      <AnimatePresence initial={false} mode="wait">
        {!isSearchOpen ? (
          <motion.div
            key="normal-header"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.12 }}
            className="flex items-center justify-between w-full"
          >
            {/* Left side: Clean decorative message icon and label */}
            <div className="flex items-center gap-1.5 text-slate-500/80">
              <MessageSquare size={16} className="text-indigo-500/80 animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest text-slate-400 select-none uppercase font-mono">Chat</span>
            </div>

            {/* Right side: Search button and Collapse button */}
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleSearch}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-all cursor-pointer flex items-center justify-center"
                title="Search messages (Ctrl+F)"
              >
                <Search size={17} />
              </button>
              <button
                onClick={onCollapse}
                className="hover:bg-slate-100/80 p-1.5 rounded-xl transition-all text-slate-400 hover:text-slate-700 cursor-pointer flex items-center justify-center"
                title="Collapse Chat"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="search-header"
            initial={{ opacity: 0, width: "40%", x: 15 }}
            animate={{ opacity: 1, width: "100%", x: 0 }}
            exit={{ opacity: 0, width: "40%", x: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="flex items-center w-full gap-1.5"
          >
            {/* Styled input area */}
            <div className="flex-1 flex items-center bg-slate-50 border border-slate-200/70 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 px-2 py-1 rounded-xl relative transition-all shadow-sm">
              <Search size={13} className="text-slate-400 mr-1.5 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search messages..."
                title="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="bg-transparent border-none outline-none text-slate-800 text-[11px] w-full placeholder:text-gray-400 font-sans"
              />
              
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="p-0.5 hover:bg-slate-200/80 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {/* Nav and state controls */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="px-1 select-none font-semibold text-[9px] text-slate-500 bg-slate-100 rounded-md py-0.5 font-mono min-w-[28px] text-center">
                {globalMatches.length > 0 ? `${activeMatchIndex}/${globalMatches.length}` : "0/0"}
              </span>

              <button
                type="button"
                disabled={globalMatches.length === 0}
                onClick={() => setActiveMatchIndex((prev) => (prev <= 1 ? globalMatches.length : prev - 1))}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-all border border-transparent"
                title="Previous (Shift+Enter)"
              >
                <ArrowUp size={13} />
              </button>

              <button
                type="button"
                disabled={globalMatches.length === 0}
                onClick={() => setActiveMatchIndex((prev) => (prev >= globalMatches.length ? 1 : prev + 1))}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-all border border-transparent"
                title="Next (Enter)"
              >
                <ArrowDown size={13} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  onToggleSearch();
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer transition-all border border-transparent"
                title="Close Search (Esc)"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
