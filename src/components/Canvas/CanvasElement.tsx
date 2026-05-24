import React, { useEffect, useRef } from "react";
import {
  Rect,
  Circle as KonvaCircle,
  Line as KonvaLine,
  Text as KonvaText,
  Transformer,
  Group,
} from "react-konva";
import { Html } from "react-konva-utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { CanvasElement } from "../../types";

interface Props {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (e: any) => void;
  onChange: (newAttrs: Partial<CanvasElement>) => void;
  onContextMenu?: (e: any, element: CanvasElement) => void;
}

export const CanvasElementComp: React.FC<Props> = ({
  element,
  isSelected,
  onSelect,
  onChange,
  onContextMenu,
}) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-expand height for text elements
  useEffect(() => {
    if (element.type === "text" && !element.isResized && contentRef.current) {
      const observer = new ResizeObserver((entries) => {
        requestAnimationFrame(() => {
          for (const entry of entries) {
            const scrollHeight = entry.target.scrollHeight;
            const desiredHeight = Math.max(100, scrollHeight);

            if (Math.abs(desiredHeight - element.height) > 1) {
              onChange({ height: desiredHeight });
            }
          }
        });
      });

      observer.observe(contentRef.current);
      return () => observer.disconnect();
    }
  }, [
    element.text,
    element.width,
    element.fontSize,
    element.type,
    element.height,
    element.isResized,
    onChange,
  ]);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, element.width, element.height]);

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    let finalWidth = node.width() * scaleX;
    let finalHeight = node.height() * scaleY;

    if (element.type === "text") {
      finalWidth = Math.max(200, Math.min(800, finalWidth));
      finalHeight = Math.max(120, Math.min(1000, finalHeight));
    } else {
      finalWidth = Math.max(5, finalWidth);
      finalHeight = Math.max(5, finalHeight);
    }

    onChange({
      x: node.x(),
      y: node.y(),
      width: finalWidth,
      height: finalHeight,
      ...(element.type === "text" ? { isResized: true } : {}),
    });
  };

  const commonProps = {
    onClick: onSelect,
    onTap: onSelect,
    ref: shapeRef,
    draggable: !isSelected || element.type !== "line", // Lines are a bit tricky
    onDragStart: (e: any) => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = "grabbing";
      onSelect(e);
    },
    onDragEnd: (e: any) => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = "grab";
      onChange({
        x: e.target.x(),
        y: e.target.y(),
      });
    },
    onMouseEnter: (e: any) => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = "grab";
    },
    onMouseLeave: (e: any) => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = "default";
    },
    onContextMenu: (e: any) => {
      if (onContextMenu) {
        if (e.evt) {
          e.evt.preventDefault();
          e.evt.stopPropagation();
          onContextMenu(e.evt, element);
        } else {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, element);
        }
      }
    },
    onMouseDown: (e: any) => {
      if (e.evt) {
        e.evt.stopPropagation();
      }
    },
    onTouchStart: (e: any) => {
      if (e.evt) {
        e.evt.stopPropagation();
      }
    },
    onPointerDown: (e: any) => {
      if (e.evt) {
        e.evt.stopPropagation();
      }
    },
    onTransformEnd: handleTransformEnd,
  };

  if (element.type === "rect") {
    return (
      <>
        <Rect
          {...commonProps}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          fill={element.fill || "transparent"}
          stroke={element.stroke || "#000"}
          dash={element.dash}
        />
        {isSelected && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
            }
          />
        )}
      </>
    );
  }

  if (element.type === "circle") {
    return (
      <>
        <KonvaCircle
          {...commonProps}
          x={element.x + element.width / 2}
          y={element.y + element.height / 2}
          radius={element.width / 2}
          fill={element.fill || "transparent"}
          stroke={element.stroke || "#000"}
          dash={element.dash}
        />
        {isSelected && (
          <Transformer
            ref={trRef}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
            ]}
          />
        )}
      </>
    );
  }

  if (element.type === "text") {
    return (
      <>
        <Group
          {...commonProps}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
        >
          {/* Invisible shape for Konva hit-testing, dragging bounds, and Transformer bounding box */}
          <Rect
            width={element.width}
            height={element.height}
            fill="rgba(0,0,0,0)"
          />
          {/* HTML Overlay for visual styling and text selection */}
          <Html
            groupProps={{ x: 0, y: 0 }}
            divProps={{ style: { pointerEvents: "none", overflow: "visible" } }}
          >
            <div
              onContextMenu={(e) => {
                if (onContextMenu) {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(e, element);
                }
              }}
              style={{
                width: element.width,
                height: element.isResized ? element.height : "auto",
                minHeight: element.isResized ? undefined : element.height,
                backgroundColor: element.fill || "#fff",
                border: `1px solid ${isSelected ? "#3b82f6" : "#e2e8f0"}`,
                borderRadius: "8px",
                padding: "24px", // This padding is the border drag area; it passes pointer-events through to the Konva Rect
                boxSizing: "border-box",
                boxShadow: isSelected
                  ? "0 0 0 2px rgba(59, 130, 246, 0.2)"
                  : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              <div
                ref={contentRef}
                style={{
                  flex: 1,
                  pointerEvents: "auto", // Capture mouse for text selection
                  cursor: "text",
                  fontSize: `${element.fontSize || 14}px`,
                  color: element.color || "#000",
                  wordBreak: "break-word",
                  fontFamily: "Inter, sans-serif",
                  overflowY: element.isResized ? "auto" : "visible",
                }}
                className="prose prose-sm max-w-none prose-img:rounded-lg prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelect(e);
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {element.text || "Double click to edit"}
                </ReactMarkdown>
              </div>

              {/* Horizontal Resizer Right Edge Zone */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "6px",
                  height: "100%",
                  cursor: "ew-resize",
                  pointerEvents: "auto",
                  zIndex: 41,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const startX = e.clientX;
                  const startWidth = element.width;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    moveEvent.preventDefault();
                    moveEvent.stopPropagation();
                    const deltaX = moveEvent.clientX - startX;

                    const minWidth = 200;
                    const maxWidth = 800;

                    const calculatedWidth = startWidth + deltaX;
                    const finalWidth = Math.max(minWidth, Math.min(maxWidth, calculatedWidth));

                    onChange({
                      width: finalWidth,
                      isResized: true,
                    });
                  };

                  const handleMouseUp = (upEvent: MouseEvent) => {
                    upEvent.preventDefault();
                    upEvent.stopPropagation();
                    window.removeEventListener("mousemove", handleMouseMove);
                    window.removeEventListener("mouseup", handleMouseUp);
                  };

                  window.addEventListener("mousemove", handleMouseMove);
                  window.addEventListener("mouseup", handleMouseUp);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const touch = e.touches[0];
                  const startX = touch.clientX;
                  const startWidth = element.width;

                  const handleTouchMove = (moveEvent: TouchEvent) => {
                    const currentTouch = moveEvent.touches[0];
                    const deltaX = currentTouch.clientX - startX;

                    const minWidth = 200;
                    const maxWidth = 800;

                    const calculatedWidth = startWidth + deltaX;
                    const finalWidth = Math.max(minWidth, Math.min(maxWidth, calculatedWidth));

                    onChange({
                      width: finalWidth,
                      isResized: true,
                    });
                  };

                  const handleTouchEnd = () => {
                    window.removeEventListener("touchmove", handleTouchMove);
                    window.removeEventListener("touchend", handleTouchEnd);
                  };

                  window.addEventListener("touchmove", handleTouchMove, { passive: false });
                  window.addEventListener("touchend", handleTouchEnd);
                }}
                className="hover:bg-slate-300/10 transition-colors"
                title="Drag right edge to resize width"
              />

              {/* Vertical Resizer Bottom Edge Zone */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  width: "100%",
                  height: "6px",
                  cursor: "ns-resize",
                  pointerEvents: "auto",
                  zIndex: 41,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const startY = e.clientY;
                  const startHeight = element.height;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    moveEvent.preventDefault();
                    moveEvent.stopPropagation();
                    const deltaY = moveEvent.clientY - startY;

                    const minHeight = 120;
                    const maxHeight = 1000;

                    const calculatedHeight = startHeight + deltaY;
                    const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));

                    onChange({
                      height: finalHeight,
                      isResized: true,
                    });
                  };

                  const handleMouseUp = (upEvent: MouseEvent) => {
                    upEvent.preventDefault();
                    upEvent.stopPropagation();
                    window.removeEventListener("mousemove", handleMouseMove);
                    window.removeEventListener("mouseup", handleMouseUp);
                  };

                  window.addEventListener("mousemove", handleMouseMove);
                  window.addEventListener("mouseup", handleMouseUp);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const touch = e.touches[0];
                  const startY = touch.clientY;
                  const startHeight = element.height;

                  const handleTouchMove = (moveEvent: TouchEvent) => {
                    const currentTouch = moveEvent.touches[0];
                    const deltaY = currentTouch.clientY - startY;

                    const minHeight = 120;
                    const maxHeight = 1000;

                    const calculatedHeight = startHeight + deltaY;
                    const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));

                    onChange({
                      height: finalHeight,
                      isResized: true,
                    });
                  };

                  const handleTouchEnd = () => {
                    window.removeEventListener("touchmove", handleTouchMove);
                    window.removeEventListener("touchend", handleTouchEnd);
                  };

                  window.addEventListener("touchmove", handleTouchMove, { passive: false });
                  window.addEventListener("touchend", handleTouchEnd);
                }}
                className="hover:bg-slate-300/10 transition-colors"
                title="Drag bottom edge to resize height"
              />

              {/* Bidirectional Resize Handle Corner */}
              <div
                style={{
                  position: "absolute",
                  bottom: "3px",
                  right: "3px",
                  width: "14px",
                  height: "14px",
                  cursor: "nwse-resize",
                  pointerEvents: "auto",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "flex-end",
                  padding: "1px",
                  zIndex: 42,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startWidth = element.width;
                  const startHeight = element.height;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    moveEvent.preventDefault();
                    moveEvent.stopPropagation();
                    const deltaX = moveEvent.clientX - startX;
                    const deltaY = moveEvent.clientY - startY;

                    const minWidth = 200;
                    const minHeight = 120;
                    const maxWidth = 800;
                    const maxHeight = 1000;

                    const calculatedWidth = startWidth + deltaX;
                    const calculatedHeight = startHeight + deltaY;

                    const finalWidth = Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
                    const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));

                    onChange({
                      width: finalWidth,
                      height: finalHeight,
                      isResized: true,
                    });
                  };

                  const handleMouseUp = (upEvent: MouseEvent) => {
                    upEvent.preventDefault();
                    upEvent.stopPropagation();
                    window.removeEventListener("mousemove", handleMouseMove);
                    window.removeEventListener("mouseup", handleMouseUp);
                  };

                  window.addEventListener("mousemove", handleMouseMove);
                  window.addEventListener("mouseup", handleMouseUp);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const touch = e.touches[0];
                  const startX = touch.clientX;
                  const startY = touch.clientY;
                  const startWidth = element.width;
                  const startHeight = element.height;

                  const handleTouchMove = (moveEvent: TouchEvent) => {
                    const currentTouch = moveEvent.touches[0];
                    const deltaX = currentTouch.clientX - startX;
                    const deltaY = currentTouch.clientY - startY;

                    const minWidth = 200;
                    const minHeight = 120;
                    const maxWidth = 800;
                    const maxHeight = 1000;

                    const calculatedWidth = startWidth + deltaX;
                    const calculatedHeight = startHeight + deltaY;

                    const finalWidth = Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
                    const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));

                    onChange({
                      width: finalWidth,
                      height: finalHeight,
                      isResized: true,
                    });
                  };

                  const handleTouchEnd = () => {
                    window.removeEventListener("touchmove", handleTouchMove);
                    window.removeEventListener("touchend", handleTouchEnd);
                  };

                  window.addEventListener("touchmove", handleTouchMove, { passive: false });
                  window.addEventListener("touchend", handleTouchEnd);
                }}
                className="group/handle"
                title="Drag diagonally to resize bidirectional"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  className="text-slate-300 group-hover/handle:text-slate-500 transition-colors pointer-events-none select-none"
                >
                  <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="8" y1="5" x2="5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="8" y1="8" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </Html>
        </Group>
      </>
    );
  }

  if (element.type === "link") {
    return (
      <>
        <Group
          {...commonProps}
          x={element.x}
          y={element.y}
          onDblClick={() => window.open(element.linkData?.url, "_blank")}
        >
          <Rect
            width={element.width}
            height={element.height}
            fill="#fff"
            stroke="#e2e8f0"
            cornerRadius={8}
            shadowBlur={10}
            shadowOpacity={0.1}
          />
          {element.linkData?.image && (
            <Rect
              width={element.width}
              height={element.height * 0.6}
              fill="#f3f4f6"
              cornerRadius={[8, 8, 0, 0]}
            />
          )}
          <KonvaText
            text={element.linkData?.title || "Loading..."}
            width={element.width}
            padding={10}
            y={element.linkData?.image ? element.height * 0.6 : 0}
            fontSize={14}
            fontStyle="bold"
            wrap="word"
          />
          <KonvaText
            text={element.linkData?.url || ""}
            width={element.width}
            padding={10}
            fontSize={10}
            fill="#3b82f6"
            y={element.height - 25}
            wrap="char"
          />
        </Group>
        {isSelected && <Transformer ref={trRef} />}
      </>
    );
  }

  if (element.type === "line" || element.type === "pencil") {
    return (
      <>
        <KonvaLine
          points={element.points}
          stroke={element.stroke || "#64748b"}
          strokeWidth={element.type === "pencil" ? 3 : 2}
          tension={element.type === "pencil" ? 0.5 : 0}
          lineCap="round"
          lineJoin="round"
          draggable
          onClick={onSelect}
          onTap={onSelect}
          ref={shapeRef}
          onDragEnd={(e: any) => {
            onChange({
              x: e.target.x(),
              y: e.target.y(),
            });
          }}
        />
        {isSelected && <Transformer ref={trRef} />}
      </>
    );
  }

  return null;
};
