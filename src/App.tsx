/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Stage, Layer, Rect } from "react-konva";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import axios from "axios";

import { CanvasElement, Message, ElementType } from "./types";
import { cn } from "./utils/cn";
import { ai, GEMINI_MODEL, COLLABORATION_PROMPT } from "./lib/gemini";
import { useHistory } from "./utils/useHistory";

// Components
import { CanvasElementComp } from "./components/Canvas/CanvasElement";
import { PropertiesPanel } from "./components/Canvas/PropertiesPanel";
import { ChatSidebar } from "./components/Chat/ChatSidebar";
import { Toolbar } from "./components/Canvas/Toolbar";
import { MiniMap } from "./components/Canvas/MiniMap";
import { ContextMenu } from "./components/Canvas/ContextMenu";

const ENABLE_DEV_AUTO_TEST = true;

const TEST_QUESTIONS = [
  "Give me a long Japanese reading passage about the history of Tokyo with its translation. Use clear markdown headings.",
  "Create a complex markdown table comparing the features of five different programming languages including speed, syntax style, and year of creation.",
  "Write a short, impactful inspirational quote about the intersection of technology and art.",
  "Explain how to make a perfect cup of coffee using a detailed nested markdown list (both ordered and unordered).",
  "Provide a markdown demonstration that includes formatted text, a link to Google, and a sample image of a modern workspace (use a generic image URL)."
];

export default function App() {
  const { 
    state: elements, 
    setState: setElements, 
    undo, redo, 
    canUndo, canRedo 
  } = useHistory([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Welcome to Miro-Canvas!', timestamp: Date.now(), userId: 'system', userName: 'System' },
    { id: '2', text: 'Drag shapes, use the pencil, or chat with the assistant.', timestamp: Date.now() + 1, userId: 'system', userName: 'System' },
  ]);
  
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<ElementType | 'select' | null>('select');
  const [lineStartId, setLineStartId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dotsImage, setDotsImage] = useState<HTMLImageElement | null>(null);
  const [dragGhost, setDragGhost] = useState<{ x: number, y: number } | null>(null);
  const [draggingTextboxId, setDraggingTextboxId] = useState<string | null>(null);

  // Custom Context Menu & Chat Context Injection States
  const [attachedCards, setAttachedCards] = useState<{ id: string; text: string }[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; element: CanvasElement } | null>(null);

  // Sorting elements dynamically to ensure zIndex layering order
  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [elements]);

  const handleContextMenu = (e: any, element: CanvasElement) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      element
    });
  };

  const handleAddToChat = (element: CanvasElement) => {
    const cardText = element.text || "";
    if (attachedCards.some(c => c.id === element.id)) return;
    setAttachedCards(prev => [...prev, { id: element.id, text: cardText }]);
  };

  const handleRemoveAttachedCard = (id: string) => {
    setAttachedCards(prev => prev.filter(c => c.id !== id));
  };

  const handleBringToFront = (element: CanvasElement) => {
    setElements(prev => {
      const maxZ = prev.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);
      return prev.map(el => el.id === element.id ? { ...el, zIndex: maxZ + 1 } : el);
    });
  };

  const handleSendToBack = (element: CanvasElement) => {
    setElements(prev => {
      const minZ = prev.reduce((min, el) => Math.min(min, el.zIndex || 0), 0);
      return prev.map(el => el.id === element.id ? { ...el, zIndex: minZ - 1 } : el);
    });
  };

  const handleDuplicate = (element: CanvasElement) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const cloned: CanvasElement = {
      ...JSON.parse(JSON.stringify(element)),
      id: newId,
      x: element.x + 20,
      y: element.y + 20,
      zIndex: (element.zIndex || 0) + 1,
    };
    setElements(prev => [...prev, cloned]);
    setSelectedId(newId);
  };

  const handleLinkMessage = (textboxId: string, messageId: string, messageText: string) => {
    setElements(prev => prev.map(el => {
      if (el.id === textboxId) {
        const bookmarks = el.bookmarks || [];
        if (bookmarks.some(b => b.messageId === messageId)) return el;
        
        const cleanMsgText = messageText.trim();
        const truncatedText = cleanMsgText.length > 55 
          ? cleanMsgText.substring(0, 52) + "..." 
          : cleanMsgText;

        const label = `Linked: "${truncatedText}"`;
        
        const newBookmark = {
          id: Math.random().toString(36).substr(2, 9),
          messageId,
          label,
          messageText: truncatedText
        };
        return {
          ...el,
          bookmarks: [...bookmarks, newBookmark]
        };
      }
      return el;
    }));
  };

  const handleJumpToMessage = (messageId: string) => {
    setIsSidebarCollapsed(false);
    setTimeout(() => {
      const el = document.getElementById(`chat-msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('animate-pulse', 'ring-4', 'ring-blue-400', 'bg-blue-50/50');
        setTimeout(() => {
          el.classList.remove('animate-pulse', 'ring-4', 'ring-blue-400', 'bg-blue-50/50');
        }, 2000);
      }
    }, 180);
  };

  // Auto-test logic
  useEffect(() => {
    if (ENABLE_DEV_AUTO_TEST) {
      const randomIndex = Math.floor(Math.random() * TEST_QUESTIONS.length);
      const testQuestion = TEST_QUESTIONS[randomIndex];
      
      // Delay slightly for initial app load animation/stability
      const timer = setTimeout(() => {
        sendMessage(testQuestion);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Dot grid generation
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#cbd5e1'; // gray-300
        ctx.beginPath();
        ctx.arc(1, 1, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
    const img = new Image();
    img.src = canvas.toDataURL();
    img.onload = () => setDotsImage(img);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const addElement = (type: ElementType, x = 100, y = 100, customAttrs: Partial<CanvasElement> = {}) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    // Add jitter if creating at default location to prevent exact stacking
    const jitterX = elements.length * 10;
    const jitterY = elements.length * 10;
    const finalX = x === 100 || x === 200 ? x + (jitterX % 100) : x;
    const finalY = y === 100 || y === 200 ? y + (jitterY % 100) : y;

    const newElement: CanvasElement = {
      id,
      type,
      x: finalX,
      y: finalY,
      width: type === "text" ? 450 : 100,
      height: type === "text" ? 200 : 100,
      fill: type === "text" ? "#ffffff" : "#f8fafc",
      stroke: "#64748b",
      fontSize: 14,
      color: "#1e293b",
      text: type === "text" ? "New memo..." : undefined,
      ...customAttrs
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(id);
    setActiveTool('select');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingTextboxId || e.dataTransfer.types.includes("application/react-textbox-id")) {
      return;
    }
    if (!containerRef.current) return;
    
    // Calculate cursor position relative to workspace for ghost preview
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragGhost({ x, y });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragGhost(null);
    const text = e.dataTransfer.getData("text/plain");
    if (!text) return;

    const stage = (window as any).konvaStage; 
    if (stage) {
      const pointerPos = stage.getRelativePointerPosition();
      if (pointerPos) {
        addElement("text", pointerPos.x, pointerPos.y, { text });
      }
    } else {
        addElement("text", 200, 200, { text });
    }
  };

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();

    if (activeTool === 'pencil') {
      setIsDrawing(true);
      const id = Math.random().toString(36).substr(2, 9);
      const newPencil: CanvasElement = {
        id,
        type: 'pencil',
        x: 0, y: 0, width: 0, height: 0,
        stroke: '#3b82f6',
        points: [pos.x, pos.y]
      };
      setElements(prev => [...prev, newPencil]);
      setSelectedId(id);
    } else if (e.target === e.target.getStage()) {
      setSelectedId(null);
      setLineStartId(null);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || activeTool !== 'pencil') return;
    
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    
    setElements(prev => {
      const lastElement = prev[prev.length - 1];
      if (lastElement && lastElement.type === 'pencil') {
          const newPoints = lastElement.points!.concat([pos.x, pos.y]);
          const newElements = prev.slice(0, prev.length - 1).concat([
            { ...lastElement, points: newPoints }
          ]);
          return newElements;
      }
      return prev;
    }, false);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
        setIsDrawing(false);
        // Finalize state in history by pushing current state as a new entry
        setElements(prev => [...prev]);
    }
  };

  const onElementClick = (id: string, e: any) => {
    if (activeTool === 'line') {
      if (!lineStartId) {
        setLineStartId(id);
      } else if (lineStartId !== id) {
        setElements(prev => {
          const startEl = prev.find(el => el.id === lineStartId);
          const endEl = prev.find(el => el.id === id);
          if (startEl && endEl) {
            const newLine: CanvasElement = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'line',
              x: 0, y: 0, width: 0, height: 0,
              stroke: '#64748b',
              points: [
                startEl.x + startEl.width / 2,
                startEl.y + startEl.height / 2,
                endEl.x + endEl.width / 2,
                endEl.y + endEl.height / 2
              ]
            };
            return [...prev, newLine];
          }
          return prev;
        });
        setLineStartId(null);
        setActiveTool('select');
      }
    } else if (activeTool === 'select') {
      setSelectedId(id);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text.match(/https?:\/\/[^\s]+/)) {
      const id = Math.random().toString(36).substr(2, 9);
      const newEl: CanvasElement = {
        id,
        type: 'link',
        x: 200, y: 200, width: 250, height: 180,
        linkData: { url: text, title: text, description: '' }
      };
      setElements(prev => [...prev, newEl]);
      
      try {
        const res = await axios.post('/api/preview', { url: text });
        setElements(prev => prev.map(el => el.id === id ? { ...el, linkData: res.data } : el));
      } catch (err) {
        console.error("Paste preview error", err);
      }
    }
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements(prev => prev.filter(el => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || isAiTyping) return;
    
    const userText = textToSend;
    const userMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      text: userText,
      timestamp: Date.now(),
      userId: 'user',
      userName: 'You'
    };
    
    setMessages(prev => [...prev, userMsg]);
    if (!overrideText) setInputText("");
    setIsAiTyping(true);

    const hasAttachments = attachedCards.length > 0;
    const activeAttachments = [...attachedCards];
    
    // Inject attached cards contents according to the required specific structure format
    const finalGeminiText = hasAttachments
      ? `[Context from Attached Cards]:\n---\n${activeAttachments.map(c => c.text || "").join("\n---\n")}\n---\n\n[User Prompt Directive]:\n${userText}`
      : userText;

    // Clear attachedCards context state instantly
    if (hasAttachments) {
      setAttachedCards([]);
    }

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { text: `Previous chat context:\n${messages.slice(-5).map(m => m.userName + ": " + m.text).join("\n")}` },
          { text: finalGeminiText }
        ],
        config: {
          systemInstruction: COLLABORATION_PROMPT
        }
      });

      const aiMsg: Message = {
        id: Math.random().toString(36).substr(2, 9),
        text: response.text || "I'm sorry, I couldn't generate a response.",
        timestamp: Date.now(),
        userId: 'ai',
        userName: 'Assistant'
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg: Message = {
        id: Math.random().toString(36).substr(2, 9),
        text: "Sorry, I'm having trouble connecting right now.",
        timestamp: Date.now(),
        userId: 'system',
        userName: 'System'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white font-sans" onPaste={handlePaste}>
      {/* Canvas Area */}
      <div className="relative flex-1 min-w-0" ref={containerRef}>
        
        <TransformWrapper
          initialScale={1}
          minScale={0.05}
          maxScale={10}
          limitToBounds={false}
          disabled={activeTool === 'pencil'} // Disable panning while drawing
        >
          {() => (
            <>
              <Toolbar 
                activeTool={activeTool} 
                onToolSelect={(tool) => {
                    if (tool === 'select') {
                        setActiveTool('select');
                    } else {
                        setActiveTool(tool);
                        if (tool !== 'pencil' && tool !== 'line') {
                            addElement(tool);
                        }
                    }
                }}
                onUndo={undo}
                onRedo={redo}
                onDelete={deleteSelected}
                canUndo={canUndo}
                canRedo={canRedo}
                hasSelection={!!selectedId}
              />

              <MiniMap elements={elements} containerSize={containerSize} />

              <PropertiesPanel 
                selectedId={selectedId}
                elements={elements}
                onUpdateElement={(id, attrs) => {
                    setElements(prev => prev.map(el => el.id === id ? { ...el, ...attrs } : el));
                }}
                onDeleteElement={(id) => {
                    setElements(prev => prev.filter(el => el.id !== id));
                    setSelectedId(null);
                }}
                onClose={() => setSelectedId(null)}
                onDragLinkStart={(id) => setDraggingTextboxId(id)}
                onDragLinkEnd={() => setDraggingTextboxId(null)}
                onClickBookmark={handleJumpToMessage}
                onLinkMessage={handleLinkMessage}
              />

              <div 
                className="h-full w-full"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={() => setDragGhost(null)}
              >
                <TransformComponent wrapperClass="!w-full !h-full">
                  <Stage
                    ref={(node) => {
                        if (node) (window as any).konvaStage = node;
                    }}
                    width={containerSize.width}
                    height={containerSize.height}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className="bg-transparent"
                  >
                    <Layer>
                      {/* Background Dot Grid */}
                      {dotsImage && (
                          <Rect
                              x={-10000}
                              y={-10000}
                              width={20000}
                              height={20000}
                              fillPatternImage={dotsImage}
                              listening={false}
                          />
                      )}

                      {sortedElements.map((el) => (
                        <CanvasElementComp
                          key={el.id}
                          element={el}
                          isSelected={el.id === selectedId}
                          onSelect={(e) => onElementClick(el.id, e)}
                          onChange={(newAttrs) => {
                            setElements(prev => prev.map((item) => (item.id === el.id ? { ...item, ...newAttrs } : item)));
                          }}
                          onContextMenu={handleContextMenu}
                        />
                      ))}
                    </Layer>
                  </Stage>
                </TransformComponent>
              </div>

              {/* Drag and Drop Ghost Preview */}
              {dragGhost && (
                <div 
                    className="fixed pointer-events-none z-[100] border-2 border-blue-400 bg-blue-50/30 rounded-lg shadow-xl"
                    style={{
                        left: dragGhost.x,
                        top: dragGhost.y,
                        width: 200,
                        height: 150,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <div className="p-3 text-[10px] uppercase font-bold text-blue-400">New Sticky Memo</div>
                </div>
              )}
            </>
          )}
        </TransformWrapper>
      </div>

      {/* Chat Sidebar Wrapper */}
      <ChatSidebar 
        width={sidebarWidth}
        isCollapsed={isSidebarCollapsed}
        messages={messages}
        inputText={inputText}
        isAiTyping={isAiTyping}
        onToggleCollapse={setIsSidebarCollapsed}
        onWidthChange={setSidebarWidth}
        onSendMessage={sendMessage}
        onInputTextChange={setInputText}
        onTogglePin={(id) => {
          setMessages(messages.map(m => m.id === id ? { ...m, isPinned: !m.isPinned } : m));
        }}
        onAddElement={(text) => addElement("text", 200, 200, { text })}
        activeDraggingId={draggingTextboxId}
        onLinkMessage={handleLinkMessage}
        attachedCards={attachedCards}
        onRemoveAttachedCard={handleRemoveAttachedCard}
      />

      {/* Floating Custom Right-Click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAddToChat={() => handleAddToChat(contextMenu.element)}
          onBringToFront={() => handleBringToFront(contextMenu.element)}
          onSendToBack={() => handleSendToBack(contextMenu.element)}
          onDuplicate={() => handleDuplicate(contextMenu.element)}
        />
      )}
    </div>
  );
}
