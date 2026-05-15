import { AlertCircle, CheckCircle2, Package, Power, ScrollText, Shield, SlidersHorizontal } from "lucide-react";
import type {
  PluginConfigFieldValue,
  PluginConfigValue,
  PluginLogEntry,
  PluginSettingsField,
  PluginSettingsSchema,
  RegisteredSettingsPanel,
} from "@hexo-cms/core";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { PluginErrorBoundary } from "./plugin-error-boundary";
import { usePluginSystem } from "./plugin-provider";

const permissionLabels: Record<string, string> = {
  "content.read": "读取内容",
  "config.read": "读取配置",
  "pluginStorage.read": "读取插件存储",
  "pluginStorage.write": "写入插件存储",
  "pluginSecret.read": "读取密钥状态",
  "pluginSecret.write": "写入插件密钥",
  "pluginConfig.write": "写入插件配置",
  "ui.contribute": "贡献 UI",
  "command.register": "注册命令",
  "event.subscribe": "订阅事件",
  "network.fetch": "网络请求",
};

export function PluginSettingsPanel() {
  const { snapshot, enablePlugin, disablePlugin, updatePluginConfig } = usePluginSystem();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>插件管理</CardTitle>
          <CardDescription>管理可信内置插件和声明式扩展能力</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.plugins.map(({ manifest, record, config, logs }) => {
            const enabled = record.state === "enabled";
            const settingsPanels = snapshot.extensions.settingsPanels.filter((panel) => panel.pluginId === manifest.id);
            const stateLabel = record.state === "error" ? "错误" : enabled ? "已启用" : "未启用";
            return (
              <div
                key={manifest.id}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]">
                        <Package size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{manifest.name}</h3>
                        <p className="text-xs text-[var(--text-tertiary)]">{manifest.id} · v{manifest.version}</p>
                      </div>
                      <Badge variant={enabled ? "success" : record.state === "error" ? "error" : "default"}>
                        {stateLabel}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">{manifest.description}</p>
                  </div>
                  <Button
                    variant={enabled ? "outline" : "default"}
                    onClick={() => (enabled ? disablePlugin(manifest.id) : enablePlugin(manifest.id))}
                  >
                    <Power size={16} />
                    {enabled ? "停用" : record.state === "error" ? "重试" : "启用"}
                  </Button>
                </div>

                <div className="mt-4 rounded-lg bg-[var(--bg-muted)] p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                    <Shield size={13} />
                    权限
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {manifest.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-secondary)]"
                      >
                        {permissionLabels[permission] ?? permission}
                      </span>
                    ))}
                  </div>
                </div>

                {record.lastError && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--status-error)] bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]">
                    <AlertCircle size={15} />
                    <span className="min-w-0">
                      {record.lastError.message}
                      {record.lastError.count && record.lastError.count > 1 ? `（连续 ${record.lastError.count} 次）` : ""}
                    </span>
                  </div>
                )}

                {logs.length > 0 && <PluginLogList logs={logs} />}

                {enabled && settingsPanels.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {settingsPanels.map((panel) => {
                      const schema = manifest.contributes?.settingsSchemas?.[panel.schema];
                      return (
                        <PluginErrorBoundary
                          key={panel.id}
                          pluginId={panel.pluginId}
                          contributionId={panel.id}
                          contributionType="settings.panel"
                        >
                          <PluginSettingsSchemaPanel
                            panel={panel}
                            schema={schema}
                            config={config}
                            onChange={(patch) => updatePluginConfig(manifest.id, patch)}
                          />
                        </PluginErrorBoundary>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>运行策略</CardTitle>
          <CardDescription>当前版本只运行随应用发布的可信内置插件</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[var(--status-success)]" />
            插件不会读取 GitHub OAuth token
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[var(--status-success)]" />
            插件 API 默认只读，写能力逐项开放
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[var(--status-success)]" />
            Web 端不支持上传本地插件包
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const logLevelLabels: Record<PluginLogEntry["level"], string> = {
  debug: "调试",
  info: "信息",
  warn: "警告",
  error: "错误",
};

const logLevelClasses: Record<PluginLogEntry["level"], string> = {
  debug: "border-[var(--border-default)] text-[var(--text-tertiary)]",
  info: "border-[var(--status-info)] text-[var(--status-info)]",
  warn: "border-[var(--status-warning)] text-[var(--status-warning)]",
  error: "border-[var(--status-error)] text-[var(--status-error)]",
};

function PluginLogList({ logs }: { logs: PluginLogEntry[] }) {
  const latestLogs = [...logs].reverse();

  return (
    <div className="mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
        <ScrollText size={13} />
        最近日志
      </div>
      <div className="space-y-2">
        {latestLogs.map((log) => (
          <div key={log.id} className="min-w-0 rounded-md bg-[var(--bg-surface)] px-2.5 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded border px-1.5 py-0.5 text-[10px] ${logLevelClasses[log.level]}`}>
                {logLevelLabels[log.level]}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">{formatLogTime(log.at)}</span>
            </div>
            <div className="mt-1 break-words text-xs text-[var(--text-secondary)]">{log.message}</div>
            {log.meta && (
              <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--bg-muted)] p-2 text-[11px] text-[var(--text-tertiary)]">
                {JSON.stringify(log.meta, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function PluginSettingsSchemaPanel({
  panel,
  schema,
  config,
  onChange,
}: {
  panel: RegisteredSettingsPanel;
  schema?: PluginSettingsSchema;
  config: PluginConfigValue;
  onChange: (patch: PluginConfigValue) => void;
}) {
  if (!schema) {
    return (
      <div className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3 text-sm text-[var(--status-warning)]">
        未找到插件配置 schema: {panel.schema}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
        <SlidersHorizontal size={13} />
        {panel.title}配置
      </div>
      <div className="space-y-3">
        {schema.fields.map((field) => (
          <PluginSettingsFieldControl
            key={field.key}
            field={field}
            value={config[field.key] ?? field.defaultValue}
            inputId={`${panel.pluginId}-${field.key}`}
            onChange={(value) => onChange({ [field.key]: value })}
          />
        ))}
      </div>
    </div>
  );
}

function PluginSettingsFieldControl({
  field,
  value,
  inputId,
  onChange,
}: {
  field: PluginSettingsField;
  value?: PluginConfigFieldValue;
  inputId: string;
  onChange: (value: PluginConfigFieldValue) => void;
}) {
  if (field.type === "boolean") {
    const checked = value !== false;
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)]">{field.label}</div>
          {field.description && <div className="text-xs text-[var(--text-tertiary)]">{field.description}</div>}
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          aria-label={field.label}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-primary)]">
          {field.label}
        </label>
        {field.description && <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">{field.description}</div>}
        <Select
          value={typeof value === "string" ? value : ""}
          onValueChange={onChange}
        >
          <SelectTrigger id={inputId} className="mt-2 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-primary)]">
        {field.label}
      </label>
      {field.description && <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">{field.description}</div>}
      <Input
        id={inputId}
        type={field.type === "password" ? "password" : field.type === "url" ? "url" : "text"}
        className="mt-2"
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
