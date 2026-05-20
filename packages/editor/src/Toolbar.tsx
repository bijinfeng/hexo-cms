import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Code2,
  FileCode,
  Heading1,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  PenLine,
  Quote,
  Strikethrough,
  Table as TableIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ToolbarProps {
  editor: Editor | null;
  sourceMode: boolean;
  onSourceToggle: () => void;
  onImageUpload: () => void;
}

export function Toolbar({ editor, sourceMode, onSourceToggle, onImageUpload }: ToolbarProps) {
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const headingMenuRef = useRef<HTMLDivElement>(null);
  const editorToolDisabled = sourceMode || !editor;

  useEffect(() => {
    if (sourceMode) {
      setHeadingMenuOpen(false);
    }
  }, [sourceMode]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headingMenuRef.current && !headingMenuRef.current.contains(e.target as Node)) {
        setHeadingMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("输入链接地址:", previousUrl || "https://");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

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

  const headings = [
    { level: 1, label: "标题 1" },
    { level: 2, label: "标题 2" },
    { level: 3, label: "标题 3" },
    { level: 4, label: "标题 4" },
    { level: 5, label: "标题 5" },
    { level: 6, label: "标题 6" },
  ] as const;

  return (
    <div className="tiptap-toolbar">
      <button
        type="button"
        onClick={() => editor?.chain().focus().toggleBold().run()}
        disabled={editorToolDisabled}
        className={`tiptap-toolbar-btn ${editor?.isActive("bold") ? "is-active" : ""}`}
        title="粗体"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        disabled={editorToolDisabled}
        className={`tiptap-toolbar-btn ${editor?.isActive("italic") ? "is-active" : ""}`}
        title="斜体"
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        disabled={editorToolDisabled}
        className={`tiptap-toolbar-btn ${editor?.isActive("strike") ? "is-active" : ""}`}
        title="删除线"
      >
        <Strikethrough size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor?.chain().focus().toggleCode().run()}
        disabled={editorToolDisabled}
        className={`tiptap-toolbar-btn ${editor?.isActive("code") ? "is-active" : ""}`}
        title="行内代码"
      >
        <Code size={16} />
      </button>
      <button
        type="button"
        onClick={setLink}
        disabled={editorToolDisabled}
        className={`tiptap-toolbar-btn ${editor?.isActive("link") ? "is-active" : ""}`}
        title="链接"
      >
        <LinkIcon size={16} />
      </button>

      <div className="tiptap-toolbar-separator" />

      <div className="tiptap-heading-dropdown" ref={headingMenuRef}>
        <button
          type="button"
          onClick={() => setHeadingMenuOpen((v) => !v)}
          disabled={editorToolDisabled}
          className={`tiptap-toolbar-btn ${editor?.isActive("heading") ? "is-active" : ""}`}
          title="标题"
        >
          <Heading1 size={16} />
        </button>
        {headingMenuOpen && editor && (
          <div className="tiptap-heading-dropdown-menu">
            {headings.map((h) => (
              <button
                key={h.level}
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: h.level }).run();
                  setHeadingMenuOpen(false);
                }}
                className={`tiptap-heading-dropdown-item ${editor.isActive("heading", { level: h.level }) ? "is-active" : ""}`}
              >
                {h.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="tiptap-toolbar-separator" />

      <button
        type="button"
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        disabled={editorToolDisabled}
        className={`tiptap-toolbar-btn ${editor?.isActive("bulletList") ? "is-active" : ""}`}
        title="无序列表"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        disabled={editorToolDisabled}
        className={`tiptap-toolbar-btn ${editor?.isActive("orderedList") ? "is-active" : ""}`}
        title="有序列表"
      >
        <ListOrdered size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor?.chain().focus().toggleTaskList().run()}
        disabled={editorToolDisabled}
        className={`tiptap-toolbar-btn ${editor?.isActive("taskList") ? "is-active" : ""}`}
        title="任务列表"
      >
        <ListChecks size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        disabled={editorToolDisabled}
        className={`tiptap-toolbar-btn ${editor?.isActive("blockquote") ? "is-active" : ""}`}
        title="引用"
      >
        <Quote size={16} />
      </button>

      <div className="tiptap-toolbar-separator" />

      <button
        type="button"
        onClick={onImageUpload}
        disabled={editorToolDisabled}
        className="tiptap-toolbar-btn"
        title="插入图片"
      >
        <ImageIcon size={16} />
      </button>
      <button
        type="button"
        onClick={addCodeBlock}
        disabled={editorToolDisabled}
        className={`tiptap-toolbar-btn ${editor?.isActive("codeBlock") ? "is-active" : ""}`}
        title="代码块"
      >
        <Code2 size={16} />
      </button>
      <button
        type="button"
        onClick={insertTable}
        disabled={editorToolDisabled}
        className="tiptap-toolbar-btn"
        title="插入表格"
      >
        <TableIcon size={16} />
      </button>
      <button
        type="button"
        onClick={addHorizontalRule}
        disabled={editorToolDisabled}
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
