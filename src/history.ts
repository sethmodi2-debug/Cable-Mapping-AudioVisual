import { useCallback, useEffect, useRef, useState } from "react";

const LIMIT = 200;
// Changes this close together (typing a name, dragging a device) undo as one step.
const MERGE_MS = 600;

export interface History<T> {
  value: T;
  set: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// Keeps past and future versions of a value for undo and redo.
export function useHistory<T>(initial: T): History<T> {
  const [state, setState] = useState({ past: [] as T[], value: initial, future: [] as T[] });
  const lastChange = useRef(0);

  const set = useCallback((next: T) => {
    const now = Date.now();
    const merge = now - lastChange.current < MERGE_MS;
    lastChange.current = now;
    setState(({ past, value }) => ({
      past: merge && past.length > 0 ? past : [...past, value].slice(-LIMIT),
      value: next,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    lastChange.current = 0;
    setState(({ past, value, future }) =>
      past.length === 0 ? { past, value, future } : { past: past.slice(0, -1), value: past[past.length - 1], future: [value, ...future] },
    );
  }, []);

  const redo = useCallback(() => {
    lastChange.current = 0;
    setState(({ past, value, future }) =>
      future.length === 0 ? { past, value, future } : { past: [...past, value], value: future[0], future: future.slice(1) },
    );
  }, []);

  return { value: state.value, set, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}

// Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl+Y redoes, except while
// typing in a field, where the field's own undo applies.
export function useUndoKeys(undo: () => void, redo: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) undo();
      else if ((key === "z" && e.shiftKey) || key === "y") redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
}
