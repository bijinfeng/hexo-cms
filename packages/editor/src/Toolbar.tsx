import { useCallback } from "react";
import {
  Image as ImageIcon,
  Code2,
  Table as TableIcon,
  Minus,
  FileCode,
  PenLine,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

interface ToolbarProps {
  editor: Editor | null;
  sourceMode: boolean;
  onSourceToggle: () => void;
  onImageUpload: () => void;
}

export function Toolbar({ editor, sourceMode, onSourceToggle, onImageUpload }: ToolbarProps) {
  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const addCodeBlock = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const addHorizontalRule = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setHorizontalRule().run();
  }, [editor]);

  return (
    <div className="tiptap-toolbar">
      <button
        type="button"
        onClick={onImageUpload}
        disabled={sourceMode}
        className="tiptap-toolbar-btn"
        title="插入图片"
      >
        <ImageIcon size={16} />
      </button>
      <button
        type="button"
        onClick={addCodeBlock}
        disabled={sourceMode}
        className="tiptap-toolbar-btn"
        title="代码块"
      >
        <Code2 size={16} />
      </button>
      <button
        type="button"
        onClick={insertTable}
        disabled={sourceMode}
        className="tiptap-toolbar-btn"
        title="插入表格"
      >
        <TableIcon size={16} />
      </button>
      <button
        type="button"
        onClick={addHorizontalRule}
        disabled={sourceMode}
        className="tiptap-toolbar-btn"
        title="分割线"
      >
        <Minus size={16} />
      </button>

      <div className="tiptap-toolbar-separator" />

      <button
        type="button"
        onClick={onSourceToggle}
        className="tiptap-toolbar-btn"
        title="切换源码"
      >
        {sourceMode ? <PenLine size={16} /> : <FileCode size={16} />}
      </button>
    </div>
  );
}
