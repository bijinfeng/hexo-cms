import { useEffect, useMemo, useState } from "react";
import { ATTACHMENTS_HELPER_PLUGIN_ID } from "@hexo-cms/core";
import { Copy, FileArchive, FileText, Loader2, Paperclip } from "lucide-react";
import { Button } from "../../components/ui/button";
import { usePluginDataProvider, usePluginSystem } from "../plugin-provider";

const ATTACHMENT_EXTS = new Set([
  "pdf",
  "zip",
  "rar",
  "7z",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
]);

interface MediaItem {
  name: string;
  path: string;
  url: string;
  size?: number;
}

function getExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentsSummaryWidget() {
  const dataProvider = usePluginDataProvider();
  const { executePluginCommand } = usePluginSystem();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedPath, setCopiedPath] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    dataProvider
      .getMediaFiles()
      .then((files) => {
        if (active) setItems(files);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "附件加载失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataProvider]);

  const attachments = useMemo(
    () => items.filter((item) => ATTACHMENT_EXTS.has(getExt(item.name))).slice(0, 4),
    [items],
  );
  const totalSize = useMemo(
    () => attachments.reduce((total, item) => total + (item.size ?? 0), 0),
    [attachments],
  );

  async function copyLink(item: MediaItem) {
    await executePluginCommand(ATTACHMENTS_HELPER_PLUGIN_ID, "attachments.copyLink", [`[${item.name}](/${item.path})`]);
    setCopiedPath(item.path);
    window.setTimeout(() => setCopiedPath(""), 1800);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-[var(--text-secondary)]">
        <Loader2 size={16} className="animate-spin" />
        正在读取附件...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--status-error)] bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[var(--bg-muted)] p-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Paperclip size={14} />
            附件数
          </div>
          <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{attachments.length}</div>
        </div>
        <div className="rounded-lg bg-[var(--bg-muted)] p-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <FileArchive size={14} />
            合计大小
          </div>
          <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{formatSize(totalSize)}</div>
        </div>
      </div>

      {attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] py-8 text-[var(--text-tertiary)]">
          <FileText size={28} className="mb-2 opacity-40" />
          <p className="text-sm">暂无附件文件</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((item) => (
            <div key={item.path} className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] p-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]">
                <FileText size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--text-primary)]">{item.name}</div>
                <div className="truncate text-xs text-[var(--text-tertiary)]">{item.path}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => copyLink(item)} title="复制附件链接">
                {copiedPath === item.path ? <span className="text-xs text-[var(--status-success)]">已复制</span> : <Copy size={14} />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
