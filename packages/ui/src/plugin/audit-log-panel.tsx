import { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle, Clock, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import type { PluginHttpAuditEntry } from "@hexo-cms/core";
import { getAuditLogStore } from "./platform-plugin-http";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

interface AuditLogPanelProps {
  pluginId?: string;
  limit?: number;
}

export function AuditLogPanel({ pluginId, limit = 20 }: AuditLogPanelProps) {
  const [entries, setEntries] = useState<PluginHttpAuditEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, [pluginId, limit]);

  function loadEntries() {
    const store = getAuditLogStore();
    const logs = store.read(pluginId, limit);
    setEntries(logs);
  }

  function clearLogs() {
    const store = getAuditLogStore();
    store.clear(pluginId);
    loadEntries();
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              HTTP 审计日志
            </span>
            <Button variant="ghost" size="sm" onClick={loadEntries}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)]">
            暂无 HTTP 请求记录
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            HTTP 审计日志
            <Badge variant="default">{entries.length}</Badge>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadEntries}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={clearLogs}>
              清空
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map((entry) => (
            <AuditLogEntry
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => toggleExpand(entry.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface AuditLogEntryProps {
  entry: PluginHttpAuditEntry;
  expanded: boolean;
  onToggle: () => void;
}

function AuditLogEntry({ entry, expanded, onToggle }: AuditLogEntryProps) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {entry.error ? (
              <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            ) : entry.responseStatus && entry.responseStatus >= 200 && entry.responseStatus < 300 ? (
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="font-mono text-xs">
                  {entry.method}
                </Badge>
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {new URL(entry.url).hostname}
                </span>
                {entry.responseStatus && (
                  <Badge
                    variant={
                      entry.responseStatus >= 200 && entry.responseStatus < 300
                        ? "success"
                        : "error"
                    }
                  >
                    {entry.responseStatus}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
                {entry.url}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {entry.durationMs !== undefined && (
              <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {entry.durationMs}ms
              </span>
            )}
            <span className="text-xs text-[var(--text-tertiary)]">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-default)] p-3 bg-[var(--bg-subtle)] space-y-3">
          <div>
            <h4 className="text-xs font-medium text-[var(--text-secondary)] mb-1">
              完整 URL
            </h4>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-[var(--bg-default)] px-2 py-1 rounded border border-[var(--border-default)] flex-1 overflow-x-auto">
                {entry.url}
              </code>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {entry.requestHeaders && Object.keys(entry.requestHeaders).length > 0 && (
            <DetailSection title="请求头" content={JSON.stringify(entry.requestHeaders, null, 2)} />
          )}

          {entry.requestBody && <DetailSection title="请求体" content={entry.requestBody} />}

          {entry.responseHeaders && Object.keys(entry.responseHeaders).length > 0 && (
            <DetailSection title="响应头" content={JSON.stringify(entry.responseHeaders, null, 2)} />
          )}

          {entry.responseBody && (
            <DetailSection
              title="响应体"
              content={
                entry.responseBody.length > 500
                  ? `${entry.responseBody.slice(0, 500)}... (${entry.responseBody.length} 字符)`
                  : entry.responseBody
              }
            />
          )}

          {entry.error && (
            <div>
              <h4 className="text-xs font-medium text-red-500 mb-1">错误</h4>
              <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800">
                {entry.error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-[var(--text-secondary)] mb-1">{title}</h4>
      <pre className="text-xs bg-[var(--bg-default)] px-2 py-1 rounded border border-[var(--border-default)] overflow-x-auto max-h-32">
        {content}
      </pre>
    </div>
  );
}
