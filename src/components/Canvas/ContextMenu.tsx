import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquarePlus, Copy, Layers, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddToChat: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDuplicate: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onAddToChat,
  onBringToFront,
  onSendToBack,
  onDuplicate,
}) => {
  const [showLayerSubmenu, setShowLayerSubmenu] = useState(false);

  return (
    <>
      {/* Clean backdrop to close menu on outside clicks */}
      <div 
        className="fixed inset-0 z-[9998]" 
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      
      {/* Desktop/System floating menu */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.12 }}
        style={{ top: y, left: x }}
        className="fixed z-[9999] min-w-[200px] bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 select-none"
      >
        <button
          onClick={() => {
            onAddToChat();
            onClose();
          }}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-800 hover:bg-slate-100/70 rounded-xl transition-all cursor-pointer text-left"
        >
          <MessageSquarePlus size={15} className="text-indigo-500" />
          <span>Add to Chat</span>
        </button>

        {/* Hover-reveal submenu for Layer Order */}
        <div 
          className="relative"
          onMouseEnter={() => setShowLayerSubmenu(true)}
          onMouseLeave={() => setShowLayerSubmenu(false)}
        >
          <button
            type="button"
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100/70 rounded-xl transition-all cursor-pointer text-left"
          >
            <span className="flex items-center gap-2.5">
              <Layers size={15} className="text-blue-500" />
              <span>Layer Order</span>
            </span>
            <ChevronRight size={13} className="text-slate-400" />
          </button>

          <AnimatePresence>
            {showLayerSubmenu && (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.1 }}
                className="absolute top-0 left-[100%] ml-1 min-w-[150px] bg-white border border-slate-200/80 rounded-xl shadow-2xl p-1 flex flex-col gap-0.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    onBringToFront();
                    onClose();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer text-left"
                >
                  <ArrowUp size={13} className="text-emerald-550 text-emerald-600" />
                  <span>Bring to Front</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSendToBack();
                    onClose();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer text-left"
                >
                  <ArrowDown size={13} className="text-rose-550 text-rose-600" />
                  <span>Send to Back</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => {
            onDuplicate();
            onClose();
          }}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100/70 rounded-xl transition-all cursor-pointer text-left"
        >
          <Copy size={15} className="text-indigo-500" />
          <span>Duplicate Card</span>
        </button>
      </motion.div>
    </>
  );
};
