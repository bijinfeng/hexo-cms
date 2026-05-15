# TipTap WYSIWYG Editor — Design Spec

**Date**: 2026-05-15
**Status**: Approved
**Package**: `@hexo-cms/editor` (new)

## 1. Problem & Goals

### Current State

Hexo CMS 当前使用 CodeMirror 6 (`@uiw/react-codemirror` + `@codemirror/lang-markdown`) 作为富文本编辑器，采用「源码编辑 + 预览」双栏模式。工具栏通过模拟插入 Markdown 语法字符串的方式工作（`insertMarkdown` 追加到末尾），不支持光标位置感知。

### Goals

- 用 TipTap 构建「所见即所得」编辑器，替换 CodeMirror 源码编辑模式
- 输入输出保持 Markdown 字符串，无缝兼容现有 Hexo 文章数据
- 作为独立 monorepo package (`@hexo-cms/editor`)，可被 web 和 desktop 两端复用
- 支持通过 TipTap 原生 Extension API 扩展
- 默认 WYSIWYG 模式，提供 Markdown 源码切换

### Non-Goals (v1)

- 不引入除 TipTap Extension 之外的自定义插件协议
- 不改变现有文章的 Markdown 存储格式
- 不实现协作编辑、评论、AI 辅助等高级功能

## 2. Architecture

### 2.1 Package Structure

新增独立 package：

```
packages/editor/
├── src/
│   ├── Editor.tsx                # 主编辑器组件（入口）
│   ├── Toolbar.tsx               # 固定工具栏（图片/代码块/表格/分割线/源码切换）
│   ├── BubbleMenu.tsx            # Notion 风浮动气泡菜单
│   ├── extensions/
│   │   ├── index.ts              # 内置扩展聚合
│   │   └── image-upload.ts       # 自定义 Image 扩展（含上传逻辑）
│   ├── styles/
│   │   └── editor.css            # TipTap + prose 样式
│   └── index.ts                  # 对外导出
├── package.json
└── tsconfig.json
```

### 2.2 Dependency Graph

```
@hexo-cms/editor   ← 纯编辑器，不依赖 core/ui
       ↑
@hexo-cms/ui       ← 引用 @hexo-cms/editor + @hexo-cms/core
       ↑
@hexo-cms/web, @hexo-cms/desktop  ← 引用 @hexo-cms/ui
```

### 2.3 Dependencies

| Package | Purpose |
|---|---|
| `@tiptap/react` | React 组件封装 |
| `@tiptap/starter-kit` | 内置扩展集 (bold/italic/heading/list/code/blockquote/hr/undo/redo) |
| `@tiptap/extension-table` `@tiptap/extension-table-row` `@tiptap/extension-table-cell` `@tiptap/extension-table-header` | 表格支持 |
| `@tiptap/extension-task-list` `@tiptap/extension-task-item` | 任务列表 |
| `@tiptap/extension-image` | 基础图片（在此基础上自定义上传扩展） |
| `@tiptap/extension-link` | 链接 |
| `@tiptap/extension-placeholder` | 空内容占位提示 |
| `@tiptap/extension-bubble-menu` | 浮动气泡菜单 |
| `@tiptap/markdown` | **官方** Markdown ↔ ProseMirror JSON 互转 |
| `marked` | @tiptap/markdown 的解析引擎（需显式安装） |

## 3. Component Design

### 3.1 Editor — 主组件

```ts
interface EditorProps {
  value: string;                               // Markdown 输入
  onChange: (markdown: string) => void;        // Markdown 输出
  extensions?: Extension[];                    // 用户注入的额外 TipTap 扩展
  onUploadMedia?: (file: File) => Promise<string>;  // 图片上传回调
  placeholder?: string;
  editable?: boolean;
}
```

内部使用 `useEditor()` 创建 TipTap 实例：

- `content: value`，搭配 `contentType: 'markdown'`
- 内置扩展 + `extensions` prop 合并（按 `name` 去重，后注册覆盖先注册）
- `on('update')` 时调用 `editor.getMarkdown()` 输出 Markdown

### 3.2 BubbleMenu — 浮动气泡菜单

基于 `@tiptap/extension-bubble-menu`，选中文字后在选区上方浮出。按钮：

| 按钮 | 命令 | 说明 |
|---|---|---|
| B | `toggleBold` | 粗体 |
| I | `toggleItalic` | 斜体 |
| S | `toggleStrike` | 删除线 |
| H | `toggleHeading` (level 下拉) | 标题 H1-H6 |
| `<>` | `toggleCode` | 行内代码 |
| 🔗 | `setLink` / `unsetLink` | 链接（弹出输入框） |
| ❝ | `toggleBlockquote` | 引用块 |
| • | `toggleBulletList` | 无序列表 |
| 1. | `toggleOrderedList` | 有序列表 |
| ☐ | `toggleTaskList` | 任务列表 |

通过 `editor.isActive()` 实时反映当前选区格式状态。

### 3.3 Toolbar — 固定工具栏

位于编辑器顶部，放置不依赖选区的操作：

| 按钮 | 说明 |
|---|---|
| 🖼 图片 | 触发 `<input type="file">`，上传后 `editor.commands.setImage({ src: url })` |
| `</>` 代码块 | `editor.commands.toggleCodeBlock()` |
| ⊞ 表格 | 插入 3x3 表格 |
| — 分割线 | `editor.commands.setHorizontalRule()` |
| 📝 源码 | 切换 WYSIWYG ↔ Markdown 源码模式 |

### 3.4 源码切换

不实现双模式编辑器。切换规则：

- **WYSIWYG 模式**：渲染 `<EditorContent editor={editor} />`
- **源码模式**：显示 `<textarea>`，内容为 `editor.getMarkdown()`
- 切回 WYSIWYG：`editor.commands.setContent(textareaValue, { contentType: 'markdown' })`

现有预览面板（`marked.parse` + `DOMPurify`）保留为可选项，源码模式下仍然可用。

## 4. Image Upload

自定义 `ImageUpload` 扩展继承 Tiptap 原生 `Image`：

1. 工具栏图片按钮 → 打开 `<input type="file" accept="image/*">`
2. 选择文件 → 调用 `onUploadMedia(file)` 获取 URL
3. `editor.commands.setImage({ src: url })` 插入

粘贴/拖拽图片：同样触发上传流程，不插入 base64。

## 5. Extension Mechanism

直接复用 TipTap Extension API。通过 `extensions` prop 注入：

```tsx
import { Editor } from '@hexo-cms/editor';
import Highlight from '@tiptap/extension-highlight';

<Editor
  value={content}
  onChange={setContent}
  extensions={[Highlight]}
/>
```

合并规则：内置扩展与外部扩展按 `extension.name` 去重，后注册覆盖先注册。v1 不引入额外插件协议层。

## 6. UI Package Integration

### 6.1 新增 MarkdownEditor 组件

在 `packages/ui/src/components/MarkdownEditor.tsx`：

```tsx
import { Editor } from '@hexo-cms/editor';

function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const dataProvider = useDataProvider();

  return (
    <Editor
      value={value}
      onChange={onChange}
      onUploadMedia={(file) => dataProvider.uploadMedia(file, /* path */)}
    />
  );
}
```

### 6.2 页面替换

4 个页面（`posts.new`, `posts.$slug`, `pages.new`, `pages.$slug`）中：

- 移除 `<CodeMirror>` 组件和自定义 toolbar
- 替换为 `<MarkdownEditor value={content} onChange={setContent} />`
- 保留现有的预览面板代码

### 6.3 代码分割 (Vite)

Web 的 `vite.config.ts` 中，将旧的 CodeMirror 分割组替换为：

```ts
{ name: "vendor-editor", test: /node_modules\/(?:@tiptap|prosemirror)\// }
```

移除旧的 `@codemirror` / `@lezer` / `dompurify` / `marked` 分割组。

### 6.4 旧依赖清理

从 `@hexo-cms/ui` 的 `package.json` 中移除：
- `@uiw/react-codemirror`
- `@codemirror/lang-markdown`
- `@codemirror/theme-one-dark`
- `marked`（移入 `@hexo-cms/editor` 依赖）
- `dompurify`（保留，预览页面仍需使用）

## 7. Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Markdown ↔ JSON 往返丢失格式 | v1 仅支持 GFM 标准语法；自定义扩展需实现 `renderMarkdown` / `parseMarkdown` 处理函数 |
| React SSR (TanStack Start) 下 Tiptap 报错 | Editor 组件用 `React.lazy()` + `<Suspense>` 包裹，确保仅客户端渲染 |
| `setContent` 未指定 `contentType` 被当 HTML 解析 | 封装时内部强制 `contentType: 'markdown'` |
| 大型文档编辑性能 | Tiptap (ProseMirror) 本身针对长文档优化；后续可加虚拟滚动评估 |
| `@tiptap/markdown` 处于 beta | 锁定版本，关注 stable 发布；回退方案为社区 `tiptap-markdown` |

## 8. Open Questions

- 图片上传时 `path` 参数如何确定（现有 toolbar 中 `insertImage` 函数使用 `post.slug || post.path` 作为路径，新编辑器需保持一致）
- 暗色/亮色主题适配策略（待工具栏/bubble menu 样式确定后补充）
