import type { Extension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BubbleMenu } from "./BubbleMenu";
import { getBuiltinExtensions } from "./extensions";
import { Toolbar } from "./Toolbar";

export interface EditorProps {
  value: string;
  onChange: (markdown: string) => void;
  extensions?: Extension[];
  onUploadMedia?: (file: File) => Promise<string>;
  onUploadError?: (error: Error) => void;
  placeholder?: string;
  editable?: boolean;
}

export function Editor({
  value,
  onChange,
  extensions = [],
  onUploadMedia,
  onUploadError,
  placeholder = "开始写作...",
  editable = true,
}: EditorProps) {
  const [sourceMode, setSourceMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);

  const allExtensions = useMemo(() => {
    const builtin = getBuiltinExtensions();

    const extensionsWithUpload = onUploadMedia
      ? builtin.map((ext) =>
          ext.name === "image"
            ? (ext as Extension).configure({
                uploadFn: onUploadMedia,
                onUploadError,
              })
            : ext,
        )
      : builtin;

    const merged = [...extensionsWithUpload];
    for (const ext of extensions) {
      const idx = merged.findIndex((e) => e.name === ext.name);
      if (idx !== -1) {
        merged[idx] = ext;
      } else {
        merged.push(ext);
      }
    }

    return merged;
  }, [extensions, onUploadMedia]);

  const markdownRef = useRef(value);

  const editor = useEditor({
    extensions: allExtensions,
    content: value,
    editable: editable && !sourceMode,
    contentType: "markdown",
    onUpdate: ({ editor: ed }) => {
      const md = ed.getMarkdown();
      markdownRef.current = md;
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: "ProseMirror",
        spellcheck: "false",
      },
    },
  });

  const prevValueRef = useRef(value);
  useEffect(() => {
    if (editor && value !== prevValueRef.current && !sourceMode) {
      editor.commands.setContent(value, { contentType: "markdown" });
    }
    prevValueRef.current = value;
  }, [value, editor, sourceMode]);

  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onUploadMedia || !editor) return;

      try {
        const url = await onUploadMedia(file);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } catch (err) {
        console.error("Editor image upload failed:", err);
        onUploadError?.(err instanceof Error ? err : new Error("Upload failed"));
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [editor, onUploadMedia],
  );

  const handleSourceToggle = useCallback(() => {
    setSourceMode((prev) => {
      const next = !prev;
      if (!next && editor && sourceRef.current) {
        editor.commands.setContent(sourceRef.current.value, { contentType: "markdown" });
      }
      if (next && editor) {
        const md = editor.getMarkdown();
        markdownRef.current = md;
        setTimeout(() => {
          sourceRef.current?.focus();
        }, 0);
      }
      return next;
    });
  }, [editor]);

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      markdownRef.current = e.target.value;
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="tiptap-editor">
      <Toolbar
        editor={editor}
        sourceMode={sourceMode}
        onSourceToggle={handleSourceToggle}
        onImageUpload={handleImageUploadClick}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {sourceMode ? (
        <textarea
          ref={sourceRef}
          className="tiptap-source-textarea"
          defaultValue={markdownRef.current}
          onChange={handleSourceChange}
          placeholder={placeholder}
        />
      ) : (
        <div className="tiptap-editor-scroll">
          <BubbleMenu editor={editor} />
          <div className="tiptap-editor-content">
            <EditorContent editor={editor} />
          </div>
        </div>
      )}
    </div>
  );
}
