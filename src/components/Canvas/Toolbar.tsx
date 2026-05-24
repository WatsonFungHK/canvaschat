import React from 'react';
import { Type, MousePointer2, Pencil, Undo2, Redo2, Trash2 } from "lucide-react";
import { ElementType } from "../../types";
import { cn } from "../../utils/cn";

interface ToolbarProps {
  activeTool: ElementType | 'select' | null;
  onToolSelect: (tool: ElementType | 'select') => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolSelect,
  onUndo,
  onRedo,
  onDelete,
  canUndo,
  canRedo,
  hasSelection
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 p-1.5 gap-1">
      {/* Category 1: Selection & Pointer */}
      <div className="flex items-center gap-1">
        <ToolButton 
          icon={<MousePointer2 size={18} />} 
          active={activeTool === 'select'} 
          onClick={() => onToolSelect('select')} 
          title="Select (V)"
        />
      </div>

      <Divider />

      {/* Category 2: Creation Tools */}
      <div className="flex items-center gap-1">
        <ToolButton 
          icon={<Type size={18} />} 
          active={activeTool === 'text'} 
          onClick={() => onToolSelect('text')} 
          title="Text Memo"
        />
        
        {/* Shapes Placeholder Icon (No function, less obvious gray, custom tooltip) */}
        <div className="relative group/shape">
          <button
            type="button"
            title="Not ready yet"
            className="p-2 rounded-xl text-gray-300 hover:text-gray-400 hover:bg-gray-50/50 transition-all flex items-center justify-center cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 select-none">
              {/* Overlapping Square & Circle */}
              <rect x="4" y="4" width="11" height="11" rx="2" />
              <circle cx="14" cy="14" r="6" />
            </svg>
          </button>
          
          {/* Custom micro-tooltip underneath the toolbar */}
          <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 opacity-0 scale-95 group-hover/shape:opacity-100 group-hover/shape:scale-100 transition-all duration-150 bg-slate-900 border border-slate-800 text-white text-[10px] uppercase tracking-wider font-semibold font-mono py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none select-none">
            Not ready yet
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900" />
          </div>
        </div>
      </div>

      <Divider />

      {/* Category 3: Drawing Tools */}
      <div className="flex items-center gap-1">
        <div className="relative group/pencil">
          <button
            type="button"
            title="Not ready yet"
            className="p-2 rounded-xl text-gray-300 hover:text-gray-400 hover:bg-gray-50/50 transition-all flex items-center justify-center cursor-not-allowed"
          >
            <Pencil size={18} className="shrink-0 select-none" />
          </button>
          
          {/* Custom micro-tooltip underneath the toolbar */}
          <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 opacity-0 scale-95 group-hover/pencil:opacity-100 group-hover/pencil:scale-100 transition-all duration-150 bg-slate-900 border border-slate-800 text-white text-[10px] uppercase tracking-wider font-semibold font-mono py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none select-none">
            Not ready yet
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900" />
          </div>
        </div>
      </div>

      <Divider />

      {/* Category 4: History & Actions */}
      <div className="flex items-center gap-1">
        <ToolButton 
          icon={<Undo2 size={18} />} 
          onClick={onUndo} 
          disabled={!canUndo}
          title="Undo"
        />
        <ToolButton 
          icon={<Redo2 size={18} />} 
          onClick={onRedo} 
          disabled={!canRedo}
          title="Redo"
        />
        {hasSelection && (
          <ToolButton 
            icon={<Trash2 size={18} />} 
            onClick={onDelete} 
            title="Delete"
            className="text-red-500 hover:bg-red-50"
          />
        )}
      </div>
    </div>
  );
};

const ToolButton = ({ icon, active, onClick, disabled, title, className }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "p-2 rounded-xl transition-all flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:pointer-events-none",
      active ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-100",
      className
    )}
  >
    {icon}
  </button>
);

const Divider = () => <div className="w-[1px] h-6 bg-gray-200 mx-1" />;
