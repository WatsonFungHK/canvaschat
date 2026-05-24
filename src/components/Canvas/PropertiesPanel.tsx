import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Bold, Italic, Underline, Heading1, Heading2, 
  List, ListOrdered, Link, Image as ImageIcon, 
  Bookmark, Trash2, Edit2, Check, MessageSquare
} from "lucide-react";
import { CanvasElement } from "../../types";
import { cn } from "../../utils/cn";

interface Props {
  selectedId: string | null;
  elements: CanvasElement[];
  onUpdateElement: (id: string, attrs: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onClose: () => void;
  onDragLinkStart?: (id: string) => void;
  onDragLinkEnd?: () => void;
  onClickBookmark?: (messageId: string) => void;
  onLinkMessage?: (textboxId: string, messageId: string, messageText: string) => void;
}

const BookmarkItem = ({ 
  bookmark, 
  onUpdateLabel, 
  onRemove, 
  onJump 
}: { 
  bookmark: any, 
  onUpdateLabel: (val: string) => void, 
  onRemove: () => void, 
  onJump: () => void 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLabel, setTempLabel] = useState(bookmark.label);

  return (
    <div className="flex flex-col gap-1 p-2 bg-gray-50 border border-gray-100 rounded-xl hover:shadow-sm hover:bg-slate-50/50 transition-all text-xs">
      <div className="flex items-center justify-between gap-1">
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={tempLabel}
              onChange={(e) => setTempLabel(e.target.value)}
              className="text-xs p-1 bg-white border border-gray-200 rounded flex-1 outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdateLabel(tempLabel);
                  setIsEditing(false);
                }
              }}
            />
            <button
              onClick={() => {
                onUpdateLabel(tempLabel);
                setIsEditing(false);
              }}
              className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer"
              title="Save"
            >
              <Check size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={onJump}
            type="button"
            title="Click to locate message in chat"
            className="font-medium text-slate-700 hover:text-blue-600 hover:underline text-left flex-1 truncate font-sans cursor-pointer transition-colors"
          >
            {bookmark.label || "Unnamed connection"}
          </button>
        )}
        
        <div className="flex items-center gap-0.5 shrink-0">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              type="button"
              className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-400 hover:text-gray-600 cursor-pointer"
              title="Rename Bookmark"
            >
              <Edit2 size={11} />
            </button>
          )}
          <button
            onClick={onRemove}
            type="button"
            className="p-1 hover:bg-rose-50 rounded transition-all text-gray-400 hover:text-rose-600 cursor-pointer"
            title="Remove Bookmark"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 truncate leading-tight select-none">
        {bookmark.messageText || "Message reference"}
      </p>
    </div>
  );
};

export const PropertiesPanel: React.FC<Props> = ({
  selectedId,
  elements,
  onUpdateElement,
  onDeleteElement,
  onClose,
  onDragLinkStart,
  onDragLinkEnd,
  onClickBookmark,
  onLinkMessage
}) => {
  const selectedElement = elements.find(el => el.id === selectedId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<'style' | 'connections'>('style');
  const [isDragOverMsg, setIsDragOverMsg] = useState(false);

  const applyFormat = (type: 'bold' | 'italic' | 'underline' | 'h1' | 'h2' | 'list' | 'list-ol' | 'link' | 'image') => {
    if (!textareaRef.current || !selectedId || !selectedElement) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = selectedElement.text || "";
    const selectedText = text.substring(start, end);
    
    let formatted = "";
    if (type === 'bold') formatted = `**${selectedText}**`;
    if (type === 'italic') formatted = `*${selectedText}*`;
    if (type === 'underline') formatted = `<u>${selectedText}</u>`;
    if (type === 'h1') formatted = `\n# ${selectedText}`;
    if (type === 'h2') formatted = `\n## ${selectedText}`;
    if (type === 'list') formatted = `\n- ${selectedText}`;
    if (type === 'list-ol') formatted = `\n1. ${selectedText}`;
    if (type === 'link') formatted = `[${selectedText || 'link text'}](https://)`;
    if (type === 'image') formatted = `![${selectedText || 'alt text'}](https://)`;
    
    const newText = text.substring(0, start) + formatted + text.substring(end);
    onUpdateElement(selectedId, { text: newText });
    
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleLinkDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/react-textbox-id", selectedId!);
    e.dataTransfer.effectAllowed = "link";
    if (onDragLinkStart) {
      onDragLinkStart(selectedId!);
    }
  };

  const handleLinkDragEnd = () => {
    if (onDragLinkEnd) {
      onDragLinkEnd();
    }
  };

  const handleDragOverMsg = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/react-message-id")) {
      e.preventDefault();
      setIsDragOverMsg(true);
    }
  };

  const handleDragLeaveMsg = () => {
    setIsDragOverMsg(false);
  };

  const handleDropMsg = (e: React.DragEvent) => {
    const messageId = e.dataTransfer.getData("application/react-message-id");
    const messageText = e.dataTransfer.getData("application/react-message-text");
    if (messageId && messageText && selectedId && onLinkMessage) {
      e.preventDefault();
      setIsDragOverMsg(false);
      onLinkMessage(selectedId, messageId, messageText);
    }
  };

  const bookmarks = selectedElement?.bookmarks || [];

  return (
    <AnimatePresence>
      {selectedId && selectedElement && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: -20 }}
          className="absolute top-20 left-4 z-10 w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider select-none">Properties</span>
            <button 
              onClick={onClose}
              className="hover:bg-gray-100 rounded-full p-1.5 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {selectedElement.type === 'text' && (
            <div className="flex bg-gray-100/70 p-1 rounded-xl border border-gray-100 shadow-inner select-none gap-1">
              <button
                onClick={() => setActiveTab('style')}
                className={cn(
                  "flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all cursor-pointer",
                  activeTab === 'style' 
                    ? "bg-white text-slate-850 shadow-sm font-semibold border border-gray-200/50" 
                    : "text-slate-550 hover:text-slate-800 hover:bg-white/40"
                )}
              >
                Style
              </button>
              <button
                onClick={() => setActiveTab('connections')}
                className={cn(
                  "flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1",
                  activeTab === 'connections' 
                    ? "bg-white text-slate-855 shadow-sm font-semibold border border-gray-200/50" 
                    : "text-slate-550 hover:text-slate-800 hover:bg-white/40"
                )}
              >
                <Bookmark size={11} className={selectedElement.bookmarks && selectedElement.bookmarks.length > 0 ? "text-blue-500 animate-pulse fill-blue-500" : ""} />
                <span>Bookmarks</span>
                {bookmarks.length > 0 && (
                  <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    {bookmarks.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {selectedElement.type === 'text' && activeTab === 'connections' && (
            <div className="space-y-3.5 pt-1">
              <div 
                draggable
                onDragStart={handleLinkDragStart}
                onDragEnd={handleLinkDragEnd}
                onDragOver={handleDragOverMsg}
                onDragLeave={handleDragLeaveMsg}
                onDrop={handleDropMsg}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all select-none cursor-grab active:cursor-grabbing border",
                  isDragOverMsg 
                    ? "bg-green-600 border-green-500 scale-[1.03] ring-4 ring-green-100" 
                    : "bg-blue-600 border-blue-500 hover:bg-blue-700 hover:scale-[1.01]"
                )}
                title="Drag this button onto any chatroom message, OR drag a message onto this button to establish a connection."
              >
                <MessageSquare size={13} className={cn("animate-pulse", isDragOverMsg && "animate-bounce")} />
                <span>{isDragOverMsg ? "Drop message here!" : "Link to message (Drag & Drop)"}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none">
                  Linked Bookmarks
                </label>
                
                {bookmarks.length === 0 ? (
                  <div className="text-center py-6 px-4 text-gray-400 border border-dashed border-gray-200 rounded-xl select-none">
                    <Bookmark size={18} className="mx-auto mb-1.5 opacity-40 text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">No Connections</span>
                    <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                      Drag the blue button above and drop it onto any message in the chat sidebar.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {bookmarks.map((bookmark) => (
                      <BookmarkItem
                        key={bookmark.id}
                        bookmark={bookmark}
                        onUpdateLabel={(newLabel) => {
                          const updated = bookmarks.map(b => b.id === bookmark.id ? { ...b, label: newLabel } : b);
                          onUpdateElement(selectedId!, { bookmarks: updated });
                        }}
                        onRemove={() => {
                          const updated = bookmarks.filter(b => b.id !== bookmark.id);
                          onUpdateElement(selectedId!, { bookmarks: updated });
                        }}
                        onJump={() => {
                          if (onClickBookmark) onClickBookmark(bookmark.messageId);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedElement.type === 'text' && activeTab === 'style' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Markdown Content</label>
                </div>
                
                {/* Toolbar for Markdown */}
                <div className="flex flex-wrap items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-100 shadow-inner">
                    <FormatButton icon={<Bold size={12} />} onClick={() => applyFormat('bold')} title="Bold" />
                    <FormatButton icon={<Italic size={12} />} onClick={() => applyFormat('italic')} title="Italic" />
                    <FormatButton icon={<Underline size={12} />} onClick={() => applyFormat('underline')} title="Underline" />
                    <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                    <FormatButton icon={<Heading1 size={12} />} onClick={() => applyFormat('h1')} title="Heading 1" />
                    <FormatButton icon={<Heading2 size={12} />} onClick={() => applyFormat('h2')} title="Heading 2" />
                    <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                    <FormatButton icon={<List size={12} />} onClick={() => applyFormat('list')} title="Unordered List" />
                    <FormatButton icon={<ListOrdered size={12} />} onClick={() => applyFormat('list-ol')} title="Ordered List" />
                    <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                    <FormatButton icon={<Link size={12} />} onClick={() => applyFormat('link')} title="Link" />
                    <FormatButton icon={<ImageIcon size={12} />} onClick={() => applyFormat('image')} title="Image" />
                </div>

                <textarea 
                  ref={textareaRef}
                  className="w-full text-xs p-3 bg-gray-50 rounded-xl border border-gray-100 focus:ring-2 focus:ring-blue-100 transition-all min-h-[120px] resize-y overflow-auto leading-relaxed text-slate-800"
                  value={selectedElement.text || ""}
                  onChange={(e) => onUpdateElement(selectedId, { text: e.target.value })}
                  placeholder="Enter markdown text here..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Size & Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      className="w-full text-xs p-2 bg-gray-50 rounded-lg border border-gray-100 outline-none"
                      value={selectedElement.fontSize || 14}
                      onChange={(e) => onUpdateElement(selectedId, { fontSize: parseInt(e.target.value) || 14 })}
                    />
                    <div className="flex flex-col items-center gap-1">
                      <input 
                          type="color"
                          className="w-10 h-8 bg-transparent border-none cursor-pointer"
                          value={selectedElement.color || "#000000"}
                          onChange={(e) => onUpdateElement(selectedId, { color: e.target.value })}
                          title="Text Color"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Background</label>
                  <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                    <input 
                        type="color"
                        className="w-10 h-7 bg-transparent border-none cursor-pointer"
                        value={selectedElement.fill || "#ffffff"}
                        onChange={(e) => onUpdateElement(selectedId, { fill: e.target.value })}
                        title="Background Color"
                    />
                    <span className="text-[10px] font-mono text-gray-400 uppercase">{selectedElement.fill || "#ffffff"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(selectedElement.type === 'rect' || selectedElement.type === 'circle') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 font-bold">FILL</label>
                  <input 
                    type="color"
                    className="w-full h-10 bg-gray-50 rounded-xl border border-gray-100 p-1.5 cursor-pointer"
                    value={selectedElement.fill || "#ffffff"}
                    onChange={(e) => onUpdateElement(selectedId, { fill: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 font-bold">STROKE</label>
                  <input 
                    type="color"
                    className="w-full h-10 bg-gray-50 rounded-xl border border-gray-100 p-1.5 cursor-pointer"
                    value={selectedElement.stroke || "#000000"}
                    onChange={(e) => onUpdateElement(selectedId, { stroke: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-100 select-none">
                  <input 
                    type="checkbox"
                    checked={!!selectedElement.dash}
                    className="rounded text-blue-600 focus:ring-blue-100 cursor-pointer"
                    onChange={(e) => onUpdateElement(selectedId, { dash: e.target.checked ? [10, 5] : undefined })}
                  />
                  Dashed Border
                </label>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button 
                onClick={() => onDeleteElement(selectedId)}
                type="button"
                className="w-full text-[10px] text-red-500 font-bold uppercase tracking-widest hover:bg-red-50 p-3 rounded-xl transition-all border border-red-100 active:scale-[0.98] cursor-pointer"
            >
                Delete Element
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const FormatButton = ({ icon, onClick, title }: { icon: React.ReactNode, onClick: () => void, title: string }) => (
    <button 
        onClick={onClick}
        type="button"
        className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600 active:scale-90 cursor-pointer"
        title={title}
    >
        {icon}
    </button>
);

