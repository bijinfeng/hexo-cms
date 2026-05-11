import type { DataProvider } from "../data-provider";
import type { HexoPost } from "../types";

export type PluginSource = "builtin" | "local-dev";

export type PluginState =
  | "installed"
  | "enabled"
  | "disabled"
  | "error"
  | "incompatible";

export type PluginPermission =
  | "content.read"
  | "config.read"
  | "pluginStorage.read"
  | "pluginStorage.write"
  | "pluginSecret.read"
  | "pluginSecret.write"
  | "pluginConfig.write"
  | "ui.contribute"
  | "command.register"
  | "event.subscribe"
  | "network.fetch";

export type PluginActivationEvent =
  | "onStartup"
  | "onDashboard"
  | "onMedia"
  | "onSettings";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  source: PluginSource;
  engine?: {
    hexoCms?: string;
  };
  activation?: PluginActivationEvent[];
  permissions: PluginPermission[];
  network?: {
    allowedHosts: string[];
  };
  contributes?: PluginContributions;
}

export interface PluginContributions {
  dashboardWidgets?: DashboardWidgetContribution[];
  settingsPanels?: SettingsPanelContribution[];
  settingsSchemas?: Record<string, PluginSettingsSchema>;
  sidebarItems?: SidebarItemContribution[];
  commands?: CommandContribution[];
}

export interface DashboardWidgetContribution {
  id: string;
  title: string;
  renderer: string;
  size: "small" | "medium" | "large";
  order?: number;
}

export interface SettingsPanelContribution {
  id: string;
  title: string;
  schema: string;
}

export type PluginSettingsFieldType = "string" | "password" | "select" | "boolean" | "url";

export type PluginConfigFieldValue = string | boolean;

export type PluginConfigValue = Record<string, PluginConfigFieldValue>;

export interface PluginSettingsOption {
  label: string;
  value: string;
}

export interface PluginSettingsField {
  key: string;
  label: string;
  type: PluginSettingsFieldType;
  description?: string;
  placeholder?: string;
  defaultValue?: PluginConfigFieldValue;
  options?: PluginSettingsOption[];
  required?: boolean;
}

export interface PluginSettingsSchema {
  id: string;
  fields: PluginSettingsField[];
}

export interface SidebarItemContribution {
  id: string;
  title: string;
  target: "plugin.settings";
}

export interface CommandContribution {
  id: string;
  title: string;
}

export type PluginContributionType = "dashboard.widget" | "settings.panel" | "sidebar.item" | "command" | "event";

export interface PluginCommandHandlerContext {
  pluginId: string;
  commandId: string;
  command: RegisteredCommand;
  args: unknown[];
}

export type PluginCommandHandler = (context: PluginCommandHandlerContext) => unknown | Promise<unknown>;

export interface PluginCommandExecutionResult {
  ok: boolean;
  command?: RegisteredCommand;
  value?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

export type PluginStorageJsonValue =
  | string
  | number
  | boolean
  | null
  | PluginStorageJsonValue[]
  | { [key: string]: PluginStorageJsonValue };

export type PluginStorageNamespaceValue = Record<string, PluginStorageJsonValue>;

export type PluginStorageStoreValue = Record<string, PluginStorageNamespaceValue>;

export interface PluginStorageAPI {
  get<T extends PluginStorageJsonValue>(key: string): Promise<T | undefined>;
  set<T extends PluginStorageJsonValue>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export type PluginSecretNamespaceValue = Record<string, string>;

export type PluginSecretStoreValue = Record<string, PluginSecretNamespaceValue>;

export interface PluginSecretAPI {
  has(key: string): Promise<boolean>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface PluginHttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface PluginHttpAPI {
  fetch<T = unknown>(url: string, options?: PluginHttpRequestOptions): Promise<T>;
}

export type BuiltinPluginEventName =
  | "post.afterSave"
  | "post.afterDelete"
  | "page.afterSave"
  | "page.afterDelete"
  | "media.afterUpload"
  | "media.afterDelete"
  | "deploy.afterTrigger"
  | "deploy.statusChange";

export type PluginEventName = BuiltinPluginEventName | (string & {});

export interface PluginEvent<TPayload = unknown> {
  name: PluginEventName;
  payload: TPayload;
  at: string;
}

export type PluginEventHandler<TPayload = unknown> = (event: PluginEvent<TPayload>) => void | Promise<void>;

export interface PluginEventSubscription {
  dispose(): void;
}

export interface PluginEventAPI {
  on<TPayload = unknown>(
    eventName: PluginEventName,
    handler: PluginEventHandler<TPayload>,
  ): PluginEventSubscription;
}

export interface PluginEventDispatchResult {
  ok: boolean;
  pluginId: string;
  eventName: PluginEventName;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

export interface PluginRuntimeErrorInput {
  contributionId: string;
  contributionType: PluginContributionType;
  message: string;
  code?: string;
  stack?: string;
  at?: string;
}

export interface PluginErrorSummary {
  message: string;
  code?: string;
  at: string;
  contributionId?: string;
  contributionType?: PluginContributionType;
  stack?: string;
  count?: number;
}

export type PluginLogLevel = "debug" | "info" | "warn" | "error";

export interface PluginLogEntry {
  id: string;
  pluginId: string;
  level: PluginLogLevel;
  message: string;
  meta?: Record<string, unknown>;
  at: string;
}

export type PluginLogStoreValue = Record<string, PluginLogEntry[]>;

export interface PluginRecord {
  id: string;
  version: string;
  source: PluginSource;
  state: PluginState;
  enabledAt?: string;
  lastError?: PluginErrorSummary;
}

export interface RegisteredDashboardWidget extends DashboardWidgetContribution {
  pluginId: string;
  pluginName: string;
}

export interface RegisteredSettingsPanel extends SettingsPanelContribution {
  pluginId: string;
  pluginName: string;
}

export interface RegisteredSidebarItem extends SidebarItemContribution {
  pluginId: string;
  pluginName: string;
}

export interface RegisteredCommand extends CommandContribution {
  pluginId: string;
  pluginName: string;
}

export interface PluginExtensionRegistrySnapshot {
  dashboardWidgets: RegisteredDashboardWidget[];
  settingsPanels: RegisteredSettingsPanel[];
  sidebarItems: RegisteredSidebarItem[];
  commands: RegisteredCommand[];
}

export interface MediaFile {
  name: string;
  path: string;
  size: number;
  url: string;
  sha: string;
}

export interface TagsResponse {
  tags: Array<{ id: string; name: string; slug: string; count: number }>;
  categories: Array<{ id: string; name: string; slug: string; count: number }>;
  total: number;
}

export interface StatsResponse {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
}

export interface ContentReadAPI {
  getPosts(): Promise<HexoPost[]>;
  getPages(): Promise<HexoPost[]>;
  getTags(): Promise<TagsResponse>;
  getMediaFiles(): Promise<MediaFile[]>;
  getStats(): Promise<StatsResponse>;
}

export interface PluginLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface PluginContext {
  readonly plugin: PluginManifest;
  readonly content: ContentReadAPI;
  readonly storage: PluginStorageAPI;
  readonly secrets: PluginSecretAPI;
  readonly events: PluginEventAPI;
  readonly http: PluginHttpAPI;
  readonly logger: PluginLogger;
}

export interface PluginManagerSnapshot {
  plugins: Array<{
    manifest: PluginManifest;
    record: PluginRecord;
    config: PluginConfigValue;
    logs: PluginLogEntry[];
  }>;
  extensions: PluginExtensionRegistrySnapshot;
}

export type PluginStateStoreValue = Record<string, PluginRecord>;

export type PluginConfigStoreValue = Record<string, PluginConfigValue>;

export function createContentReadAPI(
  pluginId: string,
  dataProvider: DataProvider,
  permissionBroker: { assert(pluginId: string, permission: PluginPermission, operation: string): void },
): ContentReadAPI {
  return {
    getPosts: () => {
      permissionBroker.assert(pluginId, "content.read", "content.getPosts");
      return dataProvider.getPosts();
    },
    getPages: () => {
      permissionBroker.assert(pluginId, "content.read", "content.getPages");
      return dataProvider.getPages();
    },
    getTags: () => {
      permissionBroker.assert(pluginId, "content.read", "content.getTags");
      return dataProvider.getTags();
    },
    getMediaFiles: () => {
      permissionBroker.assert(pluginId, "content.read", "content.getMediaFiles");
      return dataProvider.getMediaFiles();
    },
    getStats: () => {
      permissionBroker.assert(pluginId, "content.read", "content.getStats");
      return dataProvider.getStats();
    },
  };
}
