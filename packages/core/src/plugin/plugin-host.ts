import { PluginCatalog } from "./plugin-catalog";
import { PluginManager, type PluginConfigStore, type PluginStateStore } from "./plugin-manager";
import type { PluginFetch } from "./plugin-http";
import type { PluginLogStore } from "./plugin-logger";
import type { PluginSecretStore } from "./plugin-secret";
import type { PluginStorageStore } from "./plugin-storage";
import type {
  DiagnosticsReport,
  DiagnosticsTarget,
  PluginCommandExecutionResult,
  PluginConfigValue,
  PluginDefinition,
  PluginEventDispatchResult,
  PluginEventName,
  PluginManagerSnapshot,
  PluginRuntimeContext,
  PluginRuntimeErrorInput,
  RegisteredDashboardWidget,
} from "./types";
import type { DataProvider } from "../data-provider";
import type { TranslationResource } from "../i18n/types";

export interface PluginHostOptions<TRenderer = unknown> {
  catalog: PluginCatalog<TRenderer>;
  stateStore: PluginStateStore;
  configStore: PluginConfigStore;
  storageStore: PluginStorageStore;
  secretStore: PluginSecretStore;
  logStore: PluginLogStore;
  fetchImpl?: PluginFetch;
  dataProvider: DataProvider;
  /** 内置翻译资源（来自 @hexo-cms/ui），嵌套结构 */
  builtinTranslations?: Record<string, TranslationResource>;
  /** 当前语言标识 */
  currentLocale?: string;
}

export class PluginHost<TRenderer = unknown> {
  private readonly manager: PluginManager;
  private readonly renderers = new Map<string, TRenderer>();
  private readonly activeRuntimePlugins = new Set<string>();

  constructor(private readonly options: PluginHostOptions<TRenderer>) {
    this.manager = new PluginManager({
      manifests: options.catalog.manifests(),
      store: options.stateStore,
      configStore: options.configStore,
      storageStore: options.storageStore,
      secretStore: options.secretStore,
      logStore: options.logStore,
      fetchImpl: options.fetchImpl,
      dataProvider: options.dataProvider,
      defaultEnabledPluginIds: options.catalog.defaultEnabledPluginIds(),
    });
    this.syncRuntimeContributions();
  }

  snapshot(): PluginManagerSnapshot {
    return this.manager.snapshot();
  }

  manifests() {
    return this.options.catalog.manifests();
  }

  getManifest(pluginId: string) {
    return this.options.catalog.getManifest(pluginId);
  }

  enablePlugin(pluginId: string): PluginManagerSnapshot {
    this.manager.enable(pluginId);
    this.syncRuntimeContributions();
    return this.snapshot();
  }

  disablePlugin(pluginId: string): PluginManagerSnapshot {
    this.manager.disable(pluginId);
    this.syncRuntimeContributions();
    return this.snapshot();
  }

  updatePluginConfig(pluginId: string, config: PluginConfigValue): PluginManagerSnapshot {
    return this.manager.updatePluginConfig(pluginId, config);
  }

  recordPluginError(pluginId: string, error: PluginRuntimeErrorInput): PluginManagerSnapshot {
    const snapshot = this.manager.recordPluginError(pluginId, error);
    this.syncRuntimeContributions();
    return snapshot;
  }

  executePluginCommand(
    pluginId: string,
    commandId: string,
    args: unknown[] = [],
  ): Promise<PluginCommandExecutionResult> {
    return this.manager.executeCommand(pluginId, commandId, args);
  }

  runDiagnostics(target: DiagnosticsTarget): Promise<DiagnosticsReport[]> {
    return this.manager.runDiagnostics(target);
  }

  emitEvent<TPayload = unknown>(
    eventName: PluginEventName,
    payload: TPayload,
  ): Promise<PluginEventDispatchResult[]> {
    return this.manager.emitEvent(eventName, payload);
  }

  getDashboardWidgetRenderer(widget: RegisteredDashboardWidget): TRenderer | undefined {
    return this.renderers.get(`${widget.pluginId}:${widget.renderer}`);
  }

  collectPluginTranslations(): Record<string, Record<string, string>> {
    const translations: Record<string, Record<string, string>> = {};
    for (const { manifest, record } of this.snapshot().plugins) {
      if (record.state !== "enabled") continue;
      const pluginTranslations = manifest.contributes?.translations;
      if (!pluginTranslations) continue;
      for (const [locale, map] of Object.entries(pluginTranslations)) {
        if (!map) continue;
        translations[locale] = { ...(translations[locale] ?? {}), ...map };
      }
    }
    return translations;
  }

  private syncRuntimeContributions(): void {
    const enabled = new Set(
      this.snapshot().plugins
        .filter(({ record }) => record.state === "enabled")
        .map(({ manifest }) => manifest.id),
    );

    for (const pluginId of [...this.activeRuntimePlugins]) {
      if (!enabled.has(pluginId)) {
        this.unregisterRuntime(pluginId);
      }
    }

    for (const pluginId of enabled) {
      if (!this.activeRuntimePlugins.has(pluginId)) {
        this.registerRuntime(pluginId);
      }
    }
  }

  private registerRuntime(pluginId: string): void {
    const definition = this.options.catalog.getDefinition(pluginId);
    if (!definition) return;

    for (const [rendererId, renderer] of Object.entries(definition.renderers ?? {})) {
      this.renderers.set(`${pluginId}:${rendererId}`, renderer);
    }

    const context = this.createRuntimeContext(definition);

    for (const [commandId, factory] of Object.entries(definition.commands ?? {})) {
      this.manager.registerCommandHandler(pluginId, commandId, factory(context));
    }
    for (const [diagnosticsId, factory] of Object.entries(definition.diagnostics ?? {})) {
      this.manager.registerDiagnosticsHandler(pluginId, diagnosticsId, factory(context));
    }
    for (const [eventName, factory] of Object.entries(definition.events ?? {})) {
      context.events.on(eventName, factory(context));
    }

    this.activeRuntimePlugins.add(pluginId);
  }

  private unregisterRuntime(pluginId: string): void {
    const definition = this.options.catalog.getDefinition(pluginId);

    if (definition?.onDisable) {
      try {
        const context = this.createRuntimeContext(definition);
        const result = definition.onDisable(context);
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error(`Plugin ${pluginId} onDisable hook failed:`, error);
            this.manager.recordPluginError(pluginId, {
              contributionId: "lifecycle:onDisable",
              contributionType: "command",
              message: error instanceof Error ? error.message : String(error),
            });
          });
        }
      } catch (error) {
        console.error(`Plugin ${pluginId} onDisable hook failed:`, error);
        this.manager.recordPluginError(pluginId, {
          contributionId: "lifecycle:onDisable",
          contributionType: "command",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    for (const key of this.renderers.keys()) {
      if (key.startsWith(`${pluginId}:`)) this.renderers.delete(key);
    }
    this.manager.unregisterPluginRuntime(pluginId);
    this.activeRuntimePlugins.delete(pluginId);
  }

  private createRuntimeContext(definition: PluginDefinition<TRenderer>): PluginRuntimeContext {
    const pluginId = definition.manifest.id;
    const defaultLocale = "zh";
    const locale = this.options.currentLocale ?? defaultLocale;

    function interpolate(template: string, params?: Record<string, string | number>): string {
      if (!params) return template;
      return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? `{{${key}}}`));
    }

    function flattenResource(
      resource: Record<string, unknown>,
      prefix = "",
    ): Record<string, string> {
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(resource)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "string") {
          result[fullKey] = value;
        } else if (value && typeof value === "object") {
          Object.assign(result, flattenResource(value as Record<string, unknown>, fullKey));
        }
      }
      return result;
    }

    const builtin = this.options.builtinTranslations ?? {};
    const pluginTranslations = this.collectPluginTranslations();

    const mergedMaps: Record<string, Record<string, string>> = {};
    for (const loc of [locale, defaultLocale]) {
      const flatBuiltin = builtin[loc] ? flattenResource(builtin[loc]) : {};
      mergedMaps[loc] = {
        ...flatBuiltin,
        ...(pluginTranslations[loc] ?? {}),
      };
    }

    const t = (key: string, params?: Record<string, string | number>): string => {
      const currentMap = mergedMaps[locale];
      if (currentMap?.[key]) return interpolate(currentMap[key], params);
      const defaultMap = mergedMaps[defaultLocale];
      if (locale !== defaultLocale && defaultMap?.[key]) {
        return interpolate(defaultMap[key], params);
      }
      return key;
    };

    return {
      plugin: definition.manifest,
      content: this.manager.createContentAPI(pluginId),
      storage: this.manager.createStorageAPI(pluginId),
      secrets: this.manager.createSecretAPI(pluginId),
      events: this.manager.createEventAPI(pluginId),
      http: this.manager.createHttpAPI(pluginId),
      logger: this.manager.createLogger(pluginId),
      getConfig: () => this.manager.getPluginConfig(pluginId),
      t,
    };
  }
}
