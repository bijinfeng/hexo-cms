import { useCallback, useEffect, useRef, useState } from "react";
import { getEditorPreferencesSync } from "./use-editor-preferences";

function getStorageKey(key: string): string {
  return `hexo-draft-${key}`;
}

export function useAutoSave(
  key: string,
  content: string,
  delay?: number,
): {
  saved: boolean;
  error: string;
  restore: () => string | null;
  clear: () => void;
} {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const lastSavedRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const actualDelay = delay ?? getEditorPreferencesSync().autoSaveInterval;

  const save = useCallback(
    (text: string) => {
      if (!text || text === lastSavedRef.current) return;

      try {
        const storageKey = getStorageKey(key);
        localStorage.setItem(storageKey, text);
        lastSavedRef.current = text;
        setSaved(true);
        setError("");
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setSaved(false);
        setError("草稿保存失败，存储空间不足");
      }
    },
    [key],
  );

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
      setError("");
    } catch {
      setError("清除草稿失败");
    }
  }, [key]);

  return { saved, error, restore, clear };
}
