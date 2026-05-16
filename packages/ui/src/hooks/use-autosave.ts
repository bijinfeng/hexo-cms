import { useRef, useCallback, useEffect, useState } from "react";
import { getEditorPreferencesSync } from "./use-editor-preferences";

function getStorageKey(key: string): string {
  return `hexo-draft-${key}`;
}

export function useAutoSave(key: string, content: string, delay?: number): {
  saved: boolean;
  restore: () => string | null;
  clear: () => void;
} {
  const [saved, setSaved] = useState(false);
  const lastSavedRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const actualDelay = delay ?? getEditorPreferencesSync().autoSaveInterval;

  const save = useCallback((text: string) => {
    if (!text || text === lastSavedRef.current) return;

    try {
      const storageKey = getStorageKey(key);
      localStorage.setItem(storageKey, text);
      lastSavedRef.current = text;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore storage errors
    }
  }, [key]);

  // Auto-save effect
  useEffect(() => {
    if (actualDelay <= 0) return;

    timerRef.current = setTimeout(() => {
      save(content);
    }, actualDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [content, save, actualDelay]);

  const restore = useCallback((): string | null => {
    try {
      const storageKey = getStorageKey(key);
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }, [key]);

  const clear = useCallback(() => {
    try {
      const storageKey = getStorageKey(key);
      localStorage.removeItem(storageKey);
      lastSavedRef.current = "";
      setSaved(false);
    } catch {
      // ignore storage errors
    }
  }, [key]);

  return { saved, restore, clear };
}
