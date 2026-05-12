import { useCallback, useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Info, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import type { DiagnosticsIssue, DiagnosticsReport, DiagnosticsTarget } from "@hexo-cms/core";
import { usePluginSystem } from "./plugin-provider";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

function severityIcon(severity: DiagnosticsIssue["severity"]) {
  switch (severity) {
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "warn":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "info":
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function severityLabel(severity: DiagnosticsIssue["severity"]): string {
  switch (severity) {
    case "error":
      return "错误";
    case "warn":
      return "警告";
    case "info":
    default:
      return "提示";
  }
}

interface DiagnosticsPanelProps {
  target: DiagnosticsTarget;
  autoRun?: boolean;
  emptyMessage?: string;
}

export function DiagnosticsPanel({
  target,
  autoRun = true,
  emptyMessage = "未发现问题",
}: DiagnosticsPanelProps) {
  const { runDiagnostics, snapshot } = usePluginSystem();
  const [reports, setReports] = useState<DiagnosticsReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabledDiagnostics = snapshot.extensions.diagnostics.filter((d) => {
    const record = snapshot.plugins.find((p) => p.manifest.id === d.pluginId)?.record;
    return record?.state === "enabled" && d.scope === target.scope;
  });

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await runDiagnostics(target);
      setReports(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [runDiagnostics, target]);

  useEffect(() => {
    if (autoRun && enabledDiagnostics.length > 0) {
      run();
    }
  }, [autoRun, run, enabledDiagnostics.length]);

  if (enabledDiagnostics.length === 0) {
    return null;
  }

  const totalIssues = reports.reduce((sum, r) => sum + r.issues.length, 0);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--brand-primary)]" />
            <h3 className="text-sm font-semibold">诊断检查</h3>
            {totalIssues > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                {totalIssues} 个问题
              </span>
            ) : reports.length > 0 ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/40 dark:text-green-200">
                通过
              </span>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            重新检查
          </Button>
        </div>

        {error ? (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
            诊断运行失败：{error}
          </div>
        ) : null}

        {reports.length === 0 && !loading ? (
          <p className="text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
        ) : null}

        <div className="space-y-3">
          {reports.map((report) => (
            <div key={`${report.pluginId}:${report.contributionId}`} className="space-y-2">
              <div className="text-xs font-medium text-[var(--text-secondary)]">{report.title}</div>
              {report.issues.length === 0 ? (
                <p className="text-sm text-green-600 dark:text-green-400">未发现问题</p>
              ) : (
                <ul className="space-y-2">
                  {report.issues.map((issue) => (
                    <li
                      key={issue.id}
                      className="flex items-start gap-3 rounded-md bg-[var(--bg-muted)] p-3"
                    >
                      <span className="mt-0.5">{severityIcon(issue.severity)}</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{severityLabel(issue.severity)}</span>
                          {issue.field ? (
                            <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
                              {issue.field}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm">{issue.message}</p>
                        {issue.hint ? (
                          <p className="text-xs text-[var(--text-secondary)]">{issue.hint}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
