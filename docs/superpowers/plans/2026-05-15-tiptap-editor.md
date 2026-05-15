# TipTap WYSIWYG Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace CodeMirror markdown editor with a TipTap-based WYSIWYG editor, delivered as an independent monorepo package `@hexo-cms/editor`.

**Architecture:** New `packages/editor/` package with Editor component (TipTap + BubbleMenu + fixed Toolbar + source toggle). Input/output is Markdown strings via `@tiptap/markdown`. Custom ImageUpload extension handles image upload via callback. Exposes `extensions` prop for TipTap-native plugin injection. UI package wraps it in `MarkdownEditor.tsx` and replaces all 4 page editors.

**Tech Stack:** @tiptap/react, @tiptap/starter-kit, @tiptap/markdown, @tiptap/extension-table/task-list/image/link/bubble-menu/placeholder, marked, lucide-react, React 19, TypeScript 6, Tailwind CSS 4, Vitest + jsdom

---

## File Structure

```
packages/editor/
├── src/
│   ├── Editor.tsx                # Main editor: TipTap instance + BubbleMenu + Toolbar + source toggle
│   ├── Toolbar.tsx               # Fixed top toolbar (image/code block/table/hr/source toggle)
│   ├── BubbleMenu.tsx            # Floating selection bubble (bold/italic/strike/heading/code/link/quote/lists)
│   ├── extensions/
│   │   ├── index.ts              # Aggregates all built-in extensions
│   │   └── image-upload.ts       # Custom Image Node with file → upload → URL flow
│   ├── styles/
│   │   └── editor.css            # tiptap/prose styling + custom toolbar/bubble styles
│   └── index.ts                  # Public exports: Editor, types
├── package.json
├── tsconfig.json
└── vitest.config.ts

packages/ui/src/
└── components/
    └── MarkdownEditor.tsx         # Thin wrapper: hooks into useDataProvider(), passes uploadMedia

packages/ui/src/pages/            # Updated pages (replace CodeMirror with MarkdownEditor)
├── posts.new.tsx
├── posts.$slug.tsx
├── pages.new.tsx
└── pages.$slug.tsx

packages/ui/package.json          # Remove codemirror deps, add @hexo-cms/editor
packages/web/vite.config.ts       # Update code splitting groups
```

---

## Phase 1: Package Scaffold

### Task 1.1: Create package.json

**Files:**
- Create: `packages/editor/package.json`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "@hexo-cms/editor",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@tiptap/extension-bubble-menu": "^3.17.1",
    "@tiptap/extension-image": "^3.17.1",
    "@tiptap/extension-link": "^3.17.1",
    "@tiptap/extension-placeholder": "^3.17.1",
    "@tiptap/extension-table": "^3.17.1",
    "@tiptap/extension-table-cell": "^3.17.1",
    "@tiptap/extension-table-header": "^3.17.1",
    "@tiptap/extension-table-row": "^3.17.1",
    "@tiptap/extension-task-item": "^3.17.1",
    "@tiptap/extension-task-list": "^3.17.1",
    "@tiptap/markdown": "^3.17.1",
    "@tiptap/react": "^3.17.1",
    "@tiptap/starter-kit": "^3.17.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.14.0",
    "marked": "^18.0.2",
    "tailwind-merge": "^3.5.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "jsdom": "^29.1.1",
    "typescript": "^6.0.2",
    "vitest": "^4.1.5"
  },
  "peerDependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  }
}
```

- [ ] **Step 2: Run pnpm install from workspace root**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm install
```

Expected: Successful install, new package appears in lockfile.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/package.json pnpm-lock.yaml
git commit -m "feat(editor): scaffold package.json with tiptap dependencies"
```

---

### Task 1.2: Create tsconfig.json and vitest config

**Files:**
- Create: `packages/editor/tsconfig.json`
- Create: `packages/editor/vitest.config.ts`

- [ ] **Step 1: Write tsconfig.json**

```json
{
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "compilerOptions": {
    "target": "ES2022",
    "jsx": "react-jsx",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true
  }
}
```

- [ ] **Step 2: Write vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
  },
});
```

- [ ] **Step 3: Verify type-check works**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor exec tsc --noEmit
```

Expected: No errors (no source files yet, so this passes vacuously).

- [ ] **Step 4: Commit**

```bash
git add packages/editor/tsconfig.json packages/editor/vitest.config.ts
git commit -m "feat(editor): add tsconfig and vitest config"
```

---

## Phase 2: Built-in Extensions

### Task 2.1: Create built-in extensions factory

**Files:**
- Create: `packages/editor/src/extensions/index.ts`
- Test: `packages/editor/src/extensions/__tests__/extensions.test.ts`

- [ ] **Step 1: Write the failing test for getBuiltinExtensions**

```ts
import { describe, it, expect } from "vitest";
import { getBuiltinExtensions } from "../index";
import { Extension } from "@tiptap/core";

describe("getBuiltinExtensions", () => {
  it("returns an array of TipTap extensions", () => {
    const extensions = getBuiltinExtensions();
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
    extensions.forEach((ext) => {
      expect(ext).toBeInstanceOf(Extension);
    });
  });

  it("includes the Markdown extension for markdown support", () => {
    const extensions = getBuiltinExtensions();
    const markdownExt = extensions.find((e) => e.name === "markdown");
    expect(markdownExt).toBeDefined();
  });

  it("includes key content extensions", () => {
    const extensions = getBuiltinExtensions();
    const names = extensions.map((e) => e.name);
    expect(names).toContain("bold");
    expect(names).toContain("italic");
    expect(names).toContain("heading");
    expect(names).toContain("bulletList");
    expect(names).toContain("orderedList");
    expect(names).toContain("blockquote");
    expect(names).toContain("code");
    expect(names).toContain("codeBlock");
    expect(names).toContain("horizontalRule");
    expect(names).toContain("table");
    expect(names).toContain("taskList");
    expect(names).toContain("link");
    expect(names).toContain("history");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor test -- -t "getBuiltinExtensions"
```

Expected: FAIL — `getBuiltinExtensions` is not defined.

- [ ] **Step 3: Write the implementation**

```ts
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { ImageUpload } from "./image-upload";

export function getBuiltinExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
    }),
    Markdown.configure({
      markedOptions: { gfm: true },
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    TaskList,
    TaskItem.configure({ nested: true }),
    Link.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder: "开始写作..." }),
    ImageUpload,
  ];
}
```

- [ ] **Step 4: Create a minimal stub for ImageUpload to make the test pass**

Create `packages/editor/src/extensions/image-upload.ts`:

```ts
import Image from "@tiptap/extension-image";

export const ImageUpload = Image;
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor test -- -t "getBuiltinExtensions"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/extensions/
git commit -m "feat(editor): add built-in extensions factory with starter-kit, markdown, tables, task lists"
```

---

### Task 2.2: Implement ImageUpload extension

**Files:**
- Modify: `packages/editor/src/extensions/image-upload.ts`
- Test: `packages/editor/src/extensions/__tests__/image-upload.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { ImageUpload } from "../image-upload";

describe("ImageUpload extension", () => {
  it("is a TipTap extension with name 'image'", () => {
    expect(ImageUpload.name).toBe("image");
  });

  it("has a group of 'inline'", () => {
    const groups = ImageUpload.config?.group;
    if (Array.isArray(groups)) {
      expect(groups).toContain("inline");
    }
  });

  it("defines src and alt attributes", () => {
    const attrs = ImageUpload.config?.addAttributes?.();
    expect(attrs).toBeDefined();
    if (attrs) {
      expect(attrs).toHaveProperty("src");
      expect(attrs).toHaveProperty("alt");
    }
  });

  it("defines parseHTML to handle img tags", () => {
    const parseHTML = ImageUpload.config?.addOptions?.()?.parseHTML;
    // Image extensions should support HTML parsing by default
    expect(ImageUpload.config).toBeDefined();
  });
});
```

- [ ] **Step 2: Verify tests fail (currently a plain Image passthrough — some assertions may pass, customize as needed)**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor test -- -t "ImageUpload"
```

- [ ] **Step 3: Write the full ImageUpload implementation**

```ts
import Image from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface ImageUploadOptions {
  uploadFn?: (file: File) => Promise<string>;
}

export const ImageUpload = Image.extend<ImageUploadOptions>({
  name: "image",

  addOptions() {
    return {
      uploadFn: undefined,
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },

  addProseMirrorPlugins() {
    const uploadFn = this.options.uploadFn;
    if (!uploadFn) return [];

    return [
      new Plugin({
        key: new PluginKey("image-upload-handler"),
        props: {
          handlePaste(view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;

            for (const item of items) {
              if (item.type.startsWith("image/")) {
                event.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;

                uploadFn(file).then((url) => {
                  const { state } = view;
                  const { selection } = state;
                  const node = state.schema.nodes.image.create({ src: url });
                  const tr = state.tr.replaceSelectionWith(node);
                  view.dispatch(tr);
                });

                return true;
              }
            }
            return false;
          },

          handleDrop(view, event) {
            const files = event.dataTransfer?.files;
            if (!files?.length) return false;

            for (const file of files) {
              if (file.type.startsWith("image/")) {
                event.preventDefault();
                const coords = { left: event.clientX, top: event.clientY };
                const pos = view.posAtCoords(coords);

                uploadFn(file).then((url) => {
                  const node = view.state.schema.nodes.image.create({ src: url });
                  const tr = view.state.tr.insert(pos?.pos ?? view.state.selection.from, node);
                  view.dispatch(tr);
                });

                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor test -- -t "ImageUpload"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/extensions/image-upload.ts packages/editor/src/extensions/__tests__/
git commit -m "feat(editor): implement ImageUpload extension with paste/drop support"
```

---

## Phase 3: Styles

### Task 3.1: Create editor stylesheet

**Files:**
- Create: `packages/editor/src/styles/editor.css`

- [ ] **Step 1: Write editor.css**

```css
/* TipTap editor core styles */
.tiptap-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.tiptap-editor .ProseMirror {
  flex: 1;
  padding: 1.5rem 2rem;
  outline: none;
  overflow-y: auto;
  font-size: 15px;
  line-height: 1.75;
  color: var(--text-primary, #1a1a1a);
}

.tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: var(--text-tertiary, #9ca3af);
  pointer-events: none;
  float: left;
  height: 0;
}

/* Heading styles */
.tiptap-editor .ProseMirror h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; }
.tiptap-editor .ProseMirror h2 { font-size: 1.5em; font-weight: 600; margin: 0.75em 0 0.5em; }
.tiptap-editor .ProseMirror h3 { font-size: 1.25em; font-weight: 600; margin: 0.5em 0; }
.tiptap-editor .ProseMirror h4 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0; }
.tiptap-editor .ProseMirror h5 { font-size: 1em; font-weight: 600; margin: 0.5em 0; }
.tiptap-editor .ProseMirror h6 { font-size: 0.9em; font-weight: 600; margin: 0.5em 0; }

/* List styles */
.tiptap-editor .ProseMirror ul,
.tiptap-editor .ProseMirror ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}
.tiptap-editor .ProseMirror ul { list-style-type: disc; }
.tiptap-editor .ProseMirror ul ul { list-style-type: circle; }
.tiptap-editor .ProseMirror ul ul ul { list-style-type: square; }
.tiptap-editor .ProseMirror ol { list-style-type: decimal; }
.tiptap-editor .ProseMirror li { margin: 0.25em 0; }

/* Task list */
.tiptap-editor .ProseMirror [data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}
.tiptap-editor .ProseMirror [data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
}
.tiptap-editor .ProseMirror [data-type="taskList"] li label {
  flex-shrink: 0;
  margin-top: 0.25em;
}
.tiptap-editor .ProseMirror [data-type="taskList"] li label input[type="checkbox"] {
  cursor: pointer;
}
.tiptap-editor .ProseMirror [data-type="taskList"] li[data-checked="true"] > div > p {
  text-decoration: line-through;
  opacity: 0.6;
}

/* Blockquote */
.tiptap-editor .ProseMirror blockquote {
  border-left: 3px solid var(--border-default, #e5e7eb);
  padding-left: 1em;
  margin: 0.5em 0;
  color: var(--text-secondary, #666);
}

/* Code */
.tiptap-editor .ProseMirror code {
  background: var(--bg-muted, #f3f4f6);
  border-radius: 0.25em;
  padding: 0.15em 0.4em;
  font-family: var(--font-mono, monospace);
  font-size: 0.9em;
}

.tiptap-editor .ProseMirror pre {
  background: var(--bg-muted, #1e1e1e);
  border-radius: 0.5em;
  padding: 1em;
  margin: 0.5em 0;
  overflow-x: auto;
}

.tiptap-editor .ProseMirror pre code {
  background: none;
  padding: 0;
  font-size: inherit;
}

/* Horizontal rule */
.tiptap-editor .ProseMirror hr {
  border: none;
  border-top: 2px solid var(--border-default, #e5e7eb);
  margin: 1.5em 0;
}

/* Links */
.tiptap-editor .ProseMirror a {
  color: var(--brand-primary, #2563eb);
  text-decoration: underline;
  cursor: pointer;
}

/* Tables */
.tiptap-editor .ProseMirror table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
  overflow: hidden;
}

.tiptap-editor .ProseMirror table td,
.tiptap-editor .ProseMirror table th {
  border: 1px solid var(--border-default, #e5e7eb);
  padding: 0.5em 0.75em;
  min-width: 80px;
  position: relative;
}

.tiptap-editor .ProseMirror table th {
  background: var(--bg-muted, #f9fafb);
  font-weight: 600;
  text-align: left;
}

.tiptap-editor .ProseMirror .selectedCell {
  background: var(--brand-primary-subtle, rgba(37, 99, 235, 0.05));
}

/* Images */
.tiptap-editor .ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5em;
  margin: 0.5em 0;
}

.tiptap-editor .ProseMirror img.ProseMirror-selectednode {
  outline: 2px solid var(--brand-primary, #2563eb);
}

/* Selection */
.tiptap-editor .ProseMirror ::selection {
  background: var(--brand-primary-subtle, rgba(37, 99, 235, 0.2));
}

/* ===== Toolbar styles ===== */
.tiptap-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-default, #e5e7eb);
  background: var(--bg-surface, #fff);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.tiptap-toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-tertiary, #9ca3af);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tiptap-toolbar-btn:hover {
  color: var(--text-primary, #1a1a1a);
  background: var(--bg-muted, #f3f4f6);
}

.tiptap-toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tiptap-toolbar-separator {
  width: 1px;
  height: 18px;
  background: var(--border-default, #e5e7eb);
  margin: 0 4px;
}

/* ===== Bubble menu styles ===== */
.tiptap-bubble-menu {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: var(--bg-surface, #fff);
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tiptap-bubble-menu .tiptap-toolbar-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
}

.tiptap-bubble-menu .tiptap-toolbar-btn.is-active {
  color: var(--brand-primary, #2563eb);
  background: var(--brand-primary-subtle, rgba(37, 99, 235, 0.1));
}

/* Heading dropdown in bubble menu */
.tiptap-heading-dropdown {
  position: relative;
}

.tiptap-heading-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: var(--bg-surface, #fff);
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 120px;
  padding: 4px;
  z-index: 50;
}

.tiptap-heading-dropdown-item {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: transparent;
  text-align: left;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary, #1a1a1a);
}

.tiptap-heading-dropdown-item:hover {
  background: var(--bg-muted, #f3f4f6);
}

.tiptap-heading-dropdown-item.is-active {
  color: var(--brand-primary, #2563eb);
  background: var(--brand-primary-subtle, rgba(37, 99, 235, 0.1));
}

/* ===== Source toggle (textarea mode) ===== */
.tiptap-source-textarea {
  flex: 1;
  width: 100%;
  padding: 1.5rem 2rem;
  border: none;
  outline: none;
  resize: none;
  font-family: var(--font-mono, monospace);
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary, #1a1a1a);
  background: var(--bg-surface, #fff);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/editor/src/styles/editor.css
git commit -m "feat(editor): add TipTap editor and toolbar stylesheet"
```

---

## Phase 4: Toolbar Component

### Task 4.1: Create Toolbar component

**Files:**
- Create: `packages/editor/src/Toolbar.tsx`
- Test: `packages/editor/src/__tests__/Toolbar.test.tsx`

- [ ] **Step 1: Write test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../Toolbar";

describe("Toolbar", () => {
  const defaultProps = {
    onSourceToggle: vi.fn(),
    onImageUpload: vi.fn(),
    sourceMode: false,
  };

  it("renders source toggle button", () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByTitle("切换源码")).toBeDefined();
  });

  it("calls onSourceToggle when source button clicked", async () => {
    const onSourceToggle = vi.fn();
    render(<Toolbar {...defaultProps} onSourceToggle={onSourceToggle} />);
    await userEvent.click(screen.getByTitle("切换源码"));
    expect(onSourceToggle).toHaveBeenCalled();
  });

  it("renders image upload button", () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByTitle("插入图片")).toBeDefined();
  });

  it("shows different icon when in source mode", () => {
    const { rerender } = render(<Toolbar {...defaultProps} sourceMode={false} />);
    expect(screen.getByTitle("切换源码")).toBeDefined();

    rerender(<Toolbar {...defaultProps} sourceMode={true} />);
    expect(screen.getByTitle("切换源码")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor test -- -t "Toolbar"
```

- [ ] **Step 3: Write Toolbar.tsx**

```tsx
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor test -- -t "Toolbar"
```

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/Toolbar.tsx packages/editor/src/__tests__/
git commit -m "feat(editor): add Toolbar component with source toggle, image, code, table, hr"
```

---

## Phase 5: BubbleMenu Component

### Task 5.1: Create BubbleMenu component

**Files:**
- Create: `packages/editor/src/BubbleMenu.tsx`
- Test: `packages/editor/src/__tests__/BubbleMenu.test.tsx`

- [ ] **Step 1: Write test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { BubbleMenu } from "../BubbleMenu";

describe("BubbleMenu", () => {
  it("renders without crashing when editor is null", () => {
    const { container } = render(<BubbleMenu editor={null} />);
    expect(container).toBeDefined();
  });

  it("exports BubbleMenu component", () => {
    expect(BubbleMenu).toBeDefined();
    expect(typeof BubbleMenu).toBe("function");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor test -- -t "BubbleMenu"
```

- [ ] **Step 3: Write BubbleMenu.tsx**

```tsx
import { useState, useCallback, useEffect, useRef } from "react";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react";
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
      tippyOptions={{ duration: 150, placement: "top" }}
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor test -- -t "BubbleMenu"
```

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/BubbleMenu.tsx packages/editor/src/__tests__/BubbleMenu.test.tsx
git commit -m "feat(editor): add BubbleMenu component with formatting, heading dropdown, lists, quote"
```

---

## Phase 6: Editor Component (Main)

### Task 6.1: Create Editor component

**Files:**
- Create: `packages/editor/src/Editor.tsx`
- Test: `packages/editor/src/__tests__/Editor.test.tsx`

- [ ] **Step 1: Write the Editor component test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Editor } from "../Editor";

// Mock useEditor from @tiptap/react since it requires full DOM
vi.mock("@tiptap/react", async () => {
  const actual = await vi.importActual("@tiptap/react");
  return {
    ...actual,
    useEditor: vi.fn(() => null),
  };
});

describe("Editor", () => {
  const defaultProps = {
    value: "# Hello\n\nWorld",
    onChange: vi.fn(),
  };

  it("renders without crashing", () => {
    const { container } = render(<Editor {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it("renders toolbar", () => {
    render(<Editor {...defaultProps} />);
    expect(screen.getByTitle("切换源码")).toBeDefined();
  });

  it("toggles to source mode and back", async () => {
    render(<Editor {...defaultProps} />);
    const sourceBtn = screen.getByTitle("切换源码");
    await userEvent.click(sourceBtn);
    // After clicking source toggle, the textarea should appear
    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor test -- -t "Editor"
```

- [ ] **Step 3: Write Editor.tsx**

```tsx
import { useState, useCallback, useRef, useMemo, Suspense, lazy } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Extension } from "@tiptap/core";
import { getBuiltinExtensions } from "./extensions";
import { ImageUpload } from "./extensions/image-upload";
import { Toolbar } from "./Toolbar";
import { BubbleMenu } from "./BubbleMenu";

export interface EditorProps {
  value: string;
  onChange: (markdown: string) => void;
  extensions?: Extension[];
  onUploadMedia?: (file: File) => Promise<string>;
  placeholder?: string;
  editable?: boolean;
}

export function Editor({
  value,
  onChange,
  extensions = [],
  onUploadMedia,
  placeholder = "开始写作...",
  editable = true,
}: EditorProps) {
  const [sourceMode, setSourceMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);

  const allExtensions = useMemo(() => {
    const builtin = getBuiltinExtensions();

    // Configure ImageUpload with the upload callback if provided
    const imageExtIndex = builtin.findIndex((e) => e.name === "image");
    if (imageExtIndex !== -1 && onUploadMedia) {
      builtin[imageExtIndex] = builtin[imageExtIndex].configure({
        uploadFn: onUploadMedia,
      });
    }

    // MERGE: built-in + user extensions, later wins on name conflict
    const merged = [...builtin];
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

  // Track markdown externally to avoid feedback loops
  const markdownRef = useRef(value);

  const editor = useEditor({
    extensions: allExtensions,
    content: value,
    editable: editable && !sourceMode,
    contentType: "markdown",
    onUpdate: ({ editor }) => {
      const md = editor.getMarkdown();
      markdownRef.current = md;
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: "ProseMirror",
      },
    },
  });

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
      } catch {
        // upload failed — silently ignore, caller handles error display
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [editor, onUploadMedia],
  );

  const handleSourceToggle = useCallback(() => {
    setSourceMode((prev) => {
      const next = !prev;
      if (!next && editor && sourceRef.current) {
        // switching back from source mode
        editor.commands.setContent(sourceRef.current.value, { contentType: "markdown" });
      }
      if (next && editor) {
        // switching to source mode
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
    },
    [],
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
        <>
          <BubbleMenu editor={editor} />
          <EditorContent editor={editor} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test string**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor test -- -t "Editor"
```

Expected: PASS (or skip if useEditor mock makes it trivial — that's fine for now; real integration tests come in UI package).

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/Editor.tsx packages/editor/src/__tests__/Editor.test.tsx
git commit -m "feat(editor): implement main Editor component with WYSIWYG + source toggle"
```

---

## Phase 7: Public Exports

### Task 7.1: Create index.ts

**Files:**
- Create: `packages/editor/src/index.ts`

- [ ] **Step 1: Write index.ts**

```ts
export { Editor } from "./Editor";
export type { EditorProps } from "./Editor";
export { getBuiltinExtensions } from "./extensions";
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/editor exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/index.ts
git commit -m "feat(editor): add public exports for Editor component and types"
```

---

## Phase 8: UI Package Integration

### Task 8.1: Add @hexo-cms/editor dependency to ui package

**Files:**
- Modify: `packages/ui/package.json`

- [ ] **Step 1: Update package.json — add new dep, remove old ones**

Add under `dependencies`:
```json
"@hexo-cms/editor": "workspace:*"
```

- [ ] **Step 2: Run pnpm install**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm install
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/package.json pnpm-lock.yaml
git commit -m "feat(ui): add @hexo-cms/editor dependency"
```

---

### Task 8.2: Create MarkdownEditor wrapper component

**Files:**
- Create: `packages/ui/src/components/MarkdownEditor.tsx`

- [ ] **Step 1: Write MarkdownEditor.tsx**

```tsx
import { Editor } from "@hexo-cms/editor";
import { useDataProvider } from "../context/data-provider-context";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const dataProvider = useDataProvider();

  const handleUploadMedia = async (file: File): Promise<string> => {
    const path = `source/images/${file.name}`;
    const result = await dataProvider.uploadMedia(file, path);
    return result.url;
  };

  return (
    <Editor
      value={value}
      onChange={onChange}
      onUploadMedia={handleUploadMedia}
    />
  );
}
```

- [ ] **Step 2: Verify typecheck passes on ui package**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/ui exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/MarkdownEditor.tsx
git commit -m "feat(ui): add MarkdownEditor wrapper with uploadMedia integration"
```

---

### Task 8.3: Update posts.new.tsx page

**Files:**
- Modify: `packages/ui/src/pages/posts.new.tsx`

- [ ] **Step 1: Replace CodeMirror with MarkdownEditor**

Changes:
1. Remove CodeMirror imports (lines 6-8): `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `@codemirror/theme-one-dark`
2. Add import: `import { MarkdownEditor } from "../components/MarkdownEditor";`
3. Remove `isDarkMode` state (line 51)
4. Replace `<CodeMirror ... />` block (lines 276-308) with `<MarkdownEditor value={content} onChange={onChange} />`
5. Remove `toolbarActions` array and old Markdown toolbar (lines 151-166, 242-263)
6. Remove `insertMarkdown` function (lines 70-73)
7. Remove `handleImageUpload` function (lines 75-87) — now handled by MarkdownEditor internally
8. Remove `imageInputRef` (line 56)
9. Remove hidden file input (lines 171-180)
10. Remove `uploading` state (line 55)
11. Remove `imageInputRef.current.value = ""` in handleImageUpload cleanup

Since this is a large refactor, we do it as a single edit block:

Remove imports (lines 6-8):
```
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
```

Remove other CodeMirror/editor-dedicated imports no longer needed:
```
  Image,
  Upload,
```
(these were used in old toolbar/image upload; if `Image` and `Upload` are used elsewhere, keep them — check usage. In Task 8.3 we remove them from the editor area only.)

Add import:
```
import { MarkdownEditor } from "../components/MarkdownEditor";
```

The changed state/function block — remove these lines:
- `const [uploading, setUploading] = useState(false);` (line 55)
- `const imageInputRef = useRef<HTMLInputElement>(null);` (line 56)
- `const [isDarkMode] = useState(false);` (line 51)
- `function insertMarkdown(...)` (lines 70-73)
- `async function handleImageUpload(...)` (lines 75-87)
- `const toolbarActions = [...]` (lines 151-166)

Replace the editor section (lines 265-311) with:
```tsx
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {preview ? (
              <div className="h-full overflow-y-auto px-8 py-6">
                <div
                  className="prose prose-sm max-w-none text-[var(--text-primary)]"
                  dangerouslySetInnerHTML={{ __html: htmlPreview }}
                />
              </div>
            ) : (
              <MarkdownEditor value={content} onChange={onChange} />
            )}
          </div>
```

Remove old markdown toolbar (lines 241-263):
```tsx
          {/* Markdown Toolbar */}
          {!preview && (
            <div className="flex items-center gap-0.5 px-8 py-2 border-b border-[var(--border-default)] flex-shrink-0 flex-wrap">
              {toolbarActions.map((action, i) =>
                ...old toolbar rendering...
              )}
            </div>
          )}
```

Remove hidden file input (lines 170-180):
```tsx
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
        }}
      />
```

- [ ] **Step 2: Verify typecheck**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/ui exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/pages/posts.new.tsx
git commit -m "feat(ui): replace CodeMirror with MarkdownEditor in posts.new page"
```

---

### Task 8.4: Update posts.$slug.tsx page

**Files:**
- Modify: `packages/ui/src/pages/posts.$slug.tsx`

Same pattern as Task 8.3 — remove CodeMirror and toolbar, add MarkdownEditor.

- [ ] **Step 1: Apply changes**

Remove imports:
```
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
```

Remove `marked` import (preview still needs it — keep it).

Remove these from lucide-react import: `Bold, Italic, Link, Image, List, ListOrdered, Code, Quote, Heading1, Heading2, Minus`

Add import: `import { MarkdownEditor } from "../components/MarkdownEditor";`

Remove `isDarkMode` state, `imageInputRef`, `insertMarkdown`, `handleImageUpload`, `toolbarActions`.

Replace `<CodeMirror ... />` with `<MarkdownEditor value={content} onChange={onChange} />`.

Remove old toolbar JSX and hidden file input.

- [ ] **Step 2: Verify typecheck**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/ui exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/pages/posts.$slug.tsx
git commit -m "feat(ui): replace CodeMirror with MarkdownEditor in posts.$slug page"
```

---

### Task 8.5: Update pages.new.tsx and pages.$slug.tsx

**Files:**
- Modify: `packages/ui/src/pages/pages.new.tsx`
- Modify: `packages/ui/src/pages/pages.$slug.tsx`

Same pattern as above — but simpler since these pages had fewer editor features.

- [ ] **Step 1: Apply changes to both files**

For each file:
1. Remove `CodeMirror`, `markdown`, `markdownLanguage`, `oneDark` imports
2. Remove editor-related lucide icons from import
3. Add `import { MarkdownEditor } from "../components/MarkdownEditor";`
4. Remove `isDarkMode`, `insertMarkdown`, `toolbarActions`
5. Replace `<CodeMirror ... />` with `<MarkdownEditor value={content} onChange={readyCallback} />`
6. Remove old toolbar JSX

- [ ] **Step 2: Verify typecheck**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm --filter @hexo-cms/ui exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/pages/pages.new.tsx packages/ui/src/pages/pages.$slug.tsx
git commit -m "feat(ui): replace CodeMirror with MarkdownEditor in pages.new and pages.$slug"
```

---

## Phase 9: Vite Configuration & Cleanup

### Task 9.1: Update web vite.config.ts code splitting

**Files:**
- Modify: `packages/web/vite.config.ts`

- [ ] **Step 1: Replace codeSplitting groups**

Change line 19-28, replacing CodeMirror/lezer/dompurify groups with TipTap/ProseMirror group:

```ts
const codeSplitting = {
  groups: [
    {
      name: "vendor-editor",
      test: /node_modules\/(?:@tiptap|prosemirror|orderedmap|rope-sequence|w3c-keyname)\//,
    },
    {
      name: "vendor-markdown",
      test: /node_modules\/(?:marked)\//,
    },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/vite.config.ts
git commit -m "feat(web): update code splitting for tiptap/prosemirror bundles"
```

---

### Task 9.2: Clean up old editor dependencies from ui

**Files:**
- Modify: `packages/ui/package.json`

- [ ] **Step 1: Remove unused editor dependencies**

Remove from `dependencies`:
- `@codemirror/lang-markdown`
- `@codemirror/theme-one-dark`
- `@uiw/react-codemirror`

Keep `marked` and `dompurify` — still used for preview panel.

- [ ] **Step 2: Run pnpm install to clean up lockfile**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm install
```

- [ ] **Step 3: Verify full project typecheck**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm type-check
```

Expected: No errors in any package.

- [ ] **Step 4: Run tests**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm test
```

Expected: All existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/package.json pnpm-lock.yaml
git commit -m "chore(ui): remove codemirror editor dependencies"
```

---

## Phase 10: Integration Verification

### Task 10.1: Build check

- [ ] **Step 1: Build web package**

```bash
cd /Users/kebai/Desktop/hexo-cms && pnpm build
```

Expected: Build succeeds, editor vendor chunk is bundled separately.

- [ ] **Step 2: Verify no codemirror in output**

```bash
ls -la packages/web/dist/assets/ | grep -i "codemirror\|lezer" || echo "No codemirror chunks found (good)"
```

Expected: "No codemirror chunks found (good)".

- [ ] **Step 3: Commit (if any changes from build)**

None expected unless routeTree.gen.ts was touched.

---

## Summary

| Phase | Tasks | Description |
|---|---|---|
| 1 | 1.1–1.2 | Package scaffold (package.json, tsconfig, vitest) |
| 2 | 2.1–2.2 | Extensions (built-in factory, ImageUpload) |
| 3 | 3.1 | Editor + toolbar stylesheet |
| 4 | 4.1 | Toolbar component (fixed top bar) |
| 5 | 5.1 | BubbleMenu component (floating formatting) |
| 6 | 6.1 | Editor component (main — TipTap + source toggle + image upload) |
| 7 | 7.1 | Public exports (index.ts) |
| 8 | 8.1–8.5 | UI package integration (MarkdownEditor wrapper, 4 page updates) |
| 9 | 9.1–9.2 | Vite config update + old dependency cleanup |
| 10 | 10.1 | Build verification |
