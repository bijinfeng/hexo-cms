import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { ImageUpload } from "./image-upload";

export function getBuiltinExtensions() {
  const lowlight = createLowlight(common);

  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: "javascript",
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
