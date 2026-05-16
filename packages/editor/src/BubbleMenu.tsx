import { useState, useCallback, useEffect, useRef } from "react";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  ListChecks,
  Link as LinkIcon,
  Heading1,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

interface BubbleMenuProps {
  editor: Editor | null;
}

export function BubbleMenu({ editor }: BubbleMenuProps) {
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const headingMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headingMenuRef.current && !headingMenuRef.current.contains(e.target as Node)) {
        setHeadingMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) return null;

  const headings = [
    { level: 1, label: "标题 1" },
    { level: 2, label: "标题 2" },
    { level: 3, label: "标题 3" },
    { level: 4, label: "标题 4" },
    { level: 5, label: "标题 5" },
    { level: 6, label: "标题 6" },
  ];

  return (
    <TiptapBubbleMenu
      editor={editor}
      className="tiptap-bubble-menu"
    >
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`tiptap-toolbar-btn ${editor.isActive("bold") ? "is-active" : ""}`}
        title="粗体"
      >
        <Bold size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`tiptap-toolbar-btn ${editor.isActive("italic") ? "is-active" : ""}`}
        title="斜体"
      >
        <Italic size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`tiptap-toolbar-btn ${editor.isActive("strike") ? "is-active" : ""}`}
        title="删除线"
      >
        <Strikethrough size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`tiptap-toolbar-btn ${editor.isActive("code") ? "is-active" : ""}`}
        title="行内代码"
      >
        <Code size={15} />
      </button>
      <button
        type="button"
        onClick={setLink}
        className={`tiptap-toolbar-btn ${editor.isActive("link") ? "is-active" : ""}`}
        title="链接"
      >
        <LinkIcon size={15} />
      </button>

      <div className="tiptap-toolbar-separator" />

      <div className="tiptap-heading-dropdown">
        <button
          type="button"
          onClick={() => setHeadingMenuOpen((v) => !v)}
          className={`tiptap-toolbar-btn ${editor.isActive("heading") ? "is-active" : ""}`}
          title="标题"
        >
          <Heading1 size={15} />
        </button>
        {headingMenuOpen && (
          <div className="tiptap-heading-dropdown-menu" ref={headingMenuRef}>
            {headings.map((h) => (
              <button
                key={h.level}
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: h.level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
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
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`tiptap-toolbar-btn ${editor.isActive("bulletList") ? "is-active" : ""}`}
        title="无序列表"
      >
        <List size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`tiptap-toolbar-btn ${editor.isActive("orderedList") ? "is-active" : ""}`}
        title="有序列表"
      >
        <ListOrdered size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={`tiptap-toolbar-btn ${editor.isActive("taskList") ? "is-active" : ""}`}
        title="任务列表"
      >
        <ListChecks size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`tiptap-toolbar-btn ${editor.isActive("blockquote") ? "is-active" : ""}`}
        title="引用"
      >
        <Quote size={15} />
      </button>
    </TiptapBubbleMenu>
  );
}
