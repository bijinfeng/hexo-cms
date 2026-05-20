import { Editor } from "@hexo-cms/editor";
import { useCallback, useMemo, useState } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { useEditorPreferences } from "../hooks/use-editor-preferences";
import { countChars, countWords, estimateReadingTime } from "../lib/text-stats";
import { cn } from "../utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const dataProvider = useDataProvider();
  const [prefs] = useEditorPreferences();
  const [uploadError, setUploadError] = useState("");

  const wordCount = useMemo(() => countWords(value), [value]);
  const charCount = useMemo(() => countChars(value), [value]);
  const readingTime = useMemo(() => estimateReadingTime(wordCount), [wordCount]);

  const handleUploadMedia = useCallback(
    async (file: File): Promise<string> => {
      setUploadError("");
      const path = `source/images/${file.name}`;
      const result = await dataProvider.uploadMedia(file, path);
      return result.url;
    },
    [dataProvider],
  );

  const handleUploadError = useCallback((error: Error) => {
    setUploadError(`图片上传失败: ${error.message}`);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0" style={{ fontSize: `${prefs.fontSize}px` }}>
      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          value={value}
          onChange={onChange}
          onUploadMedia={handleUploadMedia}
          onUploadError={handleUploadError}
        />
      </div>
      {uploadError && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-[var(--status-error)] bg-[var(--status-error-bg)] flex-shrink-0">
          <span>{uploadError}</span>
          <button
            type="button"
            className="ml-auto text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            onClick={() => setUploadError("")}
          >
            x
          </button>
        </div>
      )}
      <div
        className={cn(
          "flex items-center justify-end gap-4 px-4 py-1.5 border-t border-[var(--border-default)] bg-[var(--bg-surface)] flex-shrink-0",
        )}
      >
        <span className="text-xs text-[var(--text-tertiary)]">{wordCount} 字</span>
        <span className="text-xs text-[var(--text-tertiary)]">{charCount} 字符</span>
        <span className="text-xs text-[var(--text-tertiary)]">{readingTime}</span>
      </div>
    </div>
  );
}
