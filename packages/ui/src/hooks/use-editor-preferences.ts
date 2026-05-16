import { useState, useEffect, useCallback } from "react";

export interface EditorPreferences {
  fontSize: number;
  editorTheme: "system" | "light" | "dark";
  autoSaveInterval: number;
}

const STORAGE_KEY = "hexo-editor-prefs";

const DEFAULTS: EditorPreferences = {
  fontSize: 16,
  editorTheme: "system",
  autoSaveInterval: 30000,
};

function loadPreferences(): EditorPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULTS };
}

function savePreferences(prefs: EditorPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

export function useEditorPreferences(): [
  EditorPreferences,
  (updates: Partial<EditorPreferences>) => void,
] {
  const [prefs, setPrefs] = useState<EditorPreferences>(() => {
    if (typeof window === "undefined") return { ...DEFAULTS };
    return loadPreferences();
  });

  const update = useCallback((updates: Partial<EditorPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updates };
      savePreferences(next);
      return next;
    });
  }, []);

  // Sync on mount in case stored value differs from SSR default
  useEffect(() => {
    setPrefs(loadPreferences());
  }, []);

  return [prefs, update];
}

export function getEditorPreferencesSync(): EditorPreferences {
  if (typeof window === "undefined") return { ...DEFAULTS };
  return loadPreferences();
}
