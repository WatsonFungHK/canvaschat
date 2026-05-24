import { useState, useCallback } from 'react';
import { CanvasElement } from '../types';

export function useHistory(initialState: CanvasElement[]) {
  const [history, setHistory] = useState<CanvasElement[][]>([initialState]);
  const [index, setIndex] = useState(0);

  const setState = useCallback((newState: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[]), pushToHistory = true) => {
    const nextState = typeof newState === 'function' ? newState(history[index]) : newState;
    
    if (pushToHistory) {
      const newHistory = history.slice(0, index + 1);
      newHistory.push(nextState);
      setHistory(newHistory);
      setIndex(newHistory.length - 1);
    } else {
      const newHistory = [...history];
      newHistory[index] = nextState;
      setHistory(newHistory);
    }
  }, [history, index]);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
    }
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(index + 1);
    }
  }, [history.length, index]);

  return {
    state: history[index],
    setState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1
  };
}
