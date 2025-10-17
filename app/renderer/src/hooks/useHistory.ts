import { useState, useCallback } from 'react';

export const useHistory = <T>(initialState: T) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const setState = useCallback((newState: T | ((prevState: T) => T)) => {
    const nextState = typeof newState === 'function'
      ? (newState as (prevState: T) => T)(history[currentIndex])
      : newState;

    if (JSON.stringify(nextState) === JSON.stringify(history[currentIndex])) {
      return; // No change
    }

    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(nextState);

    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }, [history, currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    state: history[currentIndex],
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};