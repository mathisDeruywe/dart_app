"use client";

import { useEffect, useRef, useState } from 'react';

export function useThrowUndo() {
  const [canUndo, setCanUndo] = useState(false);
  const undoAction = useRef<(() => void) | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUndo = () => {
    if (transitionTimer.current !== null) clearTimeout(transitionTimer.current);
    transitionTimer.current = null;
    undoAction.current = null;
    setCanUndo(false);
  };

  const recordUndo = (restore: () => void) => {
    undoAction.current = restore;
    setCanUndo(true);
  };

  const undo = () => {
    const restore = undoAction.current;
    if (!restore) return;

    if (transitionTimer.current !== null) clearTimeout(transitionTimer.current);
    transitionTimer.current = null;
    undoAction.current = null;
    setCanUndo(false);
    restore();
  };

  const scheduleTransition = (transition: () => void, delay: number, preserveUndo = false) => {
    transitionTimer.current = setTimeout(() => {
      transitionTimer.current = null;
      if (!preserveUndo) {
        undoAction.current = null;
        setCanUndo(false);
      }
      transition();
    }, delay);
  };

  useEffect(() => () => {
    if (transitionTimer.current !== null) clearTimeout(transitionTimer.current);
  }, []);

  return { canUndo, clearUndo, recordUndo, scheduleTransition, undo };
}

export function UndoThrowButton({ canUndo, onUndo }: { canUndo: boolean; onUndo: () => void }) {
  return (
    <button
      type="button"
      onClick={onUndo}
      disabled={!canUndo}
      title="Annuler le dernier lancer"
      className="w-full py-2 rounded-xl border border-gray-700 text-sm font-bold text-gray-300 transition-colors enabled:bg-gray-800 enabled:hover:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-600"
    >
      ↶ Annuler le dernier lancer
    </button>
  );
}