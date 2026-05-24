import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { CanvasElement } from '../../types';
import { useControls, useTransformEffect } from 'react-zoom-pan-pinch';

interface MiniMapProps {
  elements: CanvasElement[];
  containerSize?: { width: number; height: number };
}

const VIRTUAL_X = -500;
const VIRTUAL_Y = -500;
const VIRTUAL_SIZE_W = 2000;
const VIRTUAL_SIZE_H = 2000;

export const MiniMap: React.FC<MiniMapProps> = ({ elements, containerSize }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { setTransform } = useControls();
  const mapRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const [transform, setTransformState] = useState({ positionX: 0, positionY: 0, scale: 1 });

  useTransformEffect(({ state }) => {
    setTransformState({
      positionX: state.positionX,
      positionY: state.positionY,
      scale: state.scale,
    });
  });

  const { positionX, positionY, scale } = transform;
  
  const latestConfig = useRef({ containerSize, scale, setTransform });
  useEffect(() => {
    latestConfig.current = { containerSize, scale, setTransform };
  }, [containerSize, scale, setTransform]);

  // Calculate the view rectangle in mapping percentage
  // Screen left is X=0 -> Canvas left = -positionX / scale
  const viewportWidth = containerSize?.width ? containerSize.width / scale : 0;
  const viewportHeight = containerSize?.height ? containerSize.height / scale : 0;

  const canvasViewLeft = -positionX / scale;
  const canvasViewTop = -positionY / scale;

  const viewLeftPct = ((canvasViewLeft - VIRTUAL_X) / VIRTUAL_SIZE_W) * 100;
  const viewTopPct = ((canvasViewTop - VIRTUAL_Y) / VIRTUAL_SIZE_H) * 100;
  const viewWidthPct = (viewportWidth / VIRTUAL_SIZE_W) * 100;
  const viewHeightPct = (viewportHeight / VIRTUAL_SIZE_H) * 100;

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!mapRef.current || !latestConfig.current.containerSize) return;
    const { containerSize, scale, setTransform } = latestConfig.current;

    const rect = mapRef.current.getBoundingClientRect();
    
    // Clamp within minimap
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    
    // Map click coordinates to canvas center coordinates
    const canvasCenterX = (x / rect.width) * VIRTUAL_SIZE_W + VIRTUAL_X;
    const canvasCenterY = (y / rect.height) * VIRTUAL_SIZE_H + VIRTUAL_Y;

    // We want this canvas coordinate to be in the center of our screen
    // screen center X = containerSize.width / 2
    // positionX = screen center X - canvasCenterX * scale
    const newPosX = (containerSize.width / 2) - (canvasCenterX * scale);
    const newPosY = (containerSize.height / 2) - (canvasCenterY * scale);

    if (setTransform) {
      setTransform(newPosX, newPosY, scale);
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;
    updatePosition(e.clientX, e.clientY);
  }, [updatePosition]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <div className="absolute bottom-4 left-4 z-50">
      <AnimatePresence mode="wait">
        {!isCollapsed ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-48 h-48 bg-white/60 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-2xl relative overflow-hidden group select-none"
            onPointerDown={(e) => e.stopPropagation()} // prevent konva stage interaction
            onClick={(e) => e.stopPropagation()}
          >
            {/* Content Area */}
            <div 
              ref={mapRef}
              className="w-full h-full relative cursor-crosshair p-2"
              onPointerDown={handlePointerDown}
            >
              <div className="absolute inset-0 bg-gray-50/30 pointer-events-none" />
              {/* Rough layout visualization */}
              <div className="relative w-full h-full pointer-events-none">
                {elements.map((el) => {
                    const left = ((el.x - VIRTUAL_X) / VIRTUAL_SIZE_W) * 100;
                    const top = ((el.y - VIRTUAL_Y) / VIRTUAL_SIZE_H) * 100;
                    const width = (el.width / VIRTUAL_SIZE_W) * 100;
                    const height = (el.height / VIRTUAL_SIZE_H) * 100;

                    return (
                        <div 
                            key={`mini-${el.id}`}
                            className="absolute bg-gray-400/40 rounded-[2px]"
                            style={{
                                left: `${left}%`,
                                top: `${top}%`,
                                width: `${Math.max(width, 1)}%`,
                                height: `${Math.max(height, 1)}%`,
                            }}
                        />
                    );
                })}

                {/* Viewport Box */}
                {containerSize && (
                  <div 
                    className="absolute border-2 border-blue-500 bg-blue-500/10 rounded-[2px] transition-all duration-75"
                    style={{
                      left: `${viewLeftPct}%`,
                      top: `${viewTopPct}%`,
                      width: `${viewWidthPct}%`,
                      height: `${viewHeightPct}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Collapse Toggle */}
            <button 
              onClick={() => setIsCollapsed(true)}
              className="absolute top-2 right-2 p-1.5 bg-white/50 hover:bg-white rounded-lg shadow-sm transition-colors text-gray-500"
            >
              <Minimize2 size={12} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(false);
            }}
            className="p-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg text-gray-600 hover:bg-white transition-all flex items-center justify-center group"
          >
            <Maximize2 size={18} className="group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

