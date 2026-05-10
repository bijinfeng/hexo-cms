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
  | "pluginConfig.write"
  | "ui.contribute"
  | "command.register"
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

export type PluginContributionType = "dashboard.widget" | "settings.panel" | "sidebar.item" | "command";

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
}

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
  readonly logger: PluginLogger;
}

export interface PluginManagerSnapshot {
  plugins: Array<{
    manifest: PluginManifest;
    record: PluginRecord;
    config: PluginConfigValue;
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
