import { useMemo } from "react";
import { Editor } from "@hexo-cms/editor";
import { useDataProvider } from "../context/data-provider-context";
import { useEditorPreferences } from "../hooks/use-editor-preferences";
import { countWords, countChars, estimateReadingTime } from "../lib/text-stats";
import { cn } from "../utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const dataProvider = useDataProvider();
  const [prefs] = useEditorPreferences();

  const wordCount = useMemo(() => countWords(value), [value]);
  const charCount = useMemo(() => countChars(value), [value]);
  const readingTime = useMemo(() => estimateReadingTime(wordCount), [wordCount]);

  const handleUploadMedia = async (file: File): Promise<string> => {
    const path = `source/images/${file.name}`;
    const result = await dataProvider.uploadMedia(file, path);
    return result.url;
  };

  return (
    <div className="flex flex-col h-full" style={{ fontSize: `${prefs.fontSize}px` }}>
      <div className="flex-1 overflow-hidden">
        <Editor
          value={value}
          onChange={onChange}
          onUploadMedia={handleUploadMedia}
        />
      </div>
      <div
        className={cn(
          "flex items-center justify-end gap-4 px-4 py-1.5 border-t border-[var(--border-default)] bg-[var(--bg-surface)] flex-shrink-0",
        )}
      >
        <span className="text-xs text-[var(--text-tertiary)]">
          {wordCount} 字
        </span>
        <span className="text-xs text-[var(--text-tertiary)]">
          {charCount} 字符
        </span>
        <span className="text-xs text-[var(--text-tertiary)]">
          {readingTime}
        </span>
      </div>
    </div>
  );
}
