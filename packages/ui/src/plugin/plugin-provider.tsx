import { createContext, useContext, useMemo, useState, useCallback } from "react";
import {
  ATTACHMENTS_HELPER_PLUGIN_ID,
  COMMENTS_OVERVIEW_PLUGIN_ID,
  SEO_INSPECTOR_PLUGIN_ID,
  PluginManager,
  builtinPluginManifests,
  type DiagnosticsHandler,
  type DiagnosticsReport,
  type DiagnosticsTarget,
  type PluginCommandExecutionResult,
  type PluginConfigStore,
  type PluginConfigValue,
  type PluginFetch,
  type PluginLogStore,
  type PluginManagerSnapshot,
  type PluginRuntimeErrorInput,
  type PluginSecretStore,
  type PluginStateStore,
  type PluginStorageStore,
} from "@hexo-cms/core";
import { DataProviderProvider, useDataProvider } from "../context/data-provider-context";
import { createPlatformPluginConfigStore } from "./platform-plugin-config";
import { createPlatformPluginFetch } from "./platform-plugin-http";
import { createPlatformPluginLogStore } from "./platform-plugin-log";
import { createPlatformPluginSecretStore } from "./platform-plugin-secret";
import { createPlatformPluginStateStore } from "./platform-plugin-state";
import { createPlatformPluginStorageStore } from "./platform-plugin-storage";
import { withPluginEvents } from "./plugin-event-data-provider";

interface PluginContextValue {
  manager: PluginManager;
  snapshot: PluginManagerSnapshot;
  enablePlugin: (pluginId: string) => void;
  disablePlugin: (pluginId: string) => void;
  updatePluginConfig: (pluginId: string, config: PluginConfigValue) => void;
  recordPluginError: (pluginId: string, error: PluginRuntimeErrorInput) => void;
  executePluginCommand: (pluginId: string, commandId: string, args?: unknown[]) => Promise<PluginCommandExecutionResult>;
  runDiagnostics: (target: DiagnosticsTarget) => Promise<DiagnosticsReport[]>;
}

const PluginContext = createContext<PluginContextValue | null>(null);

function createDefaultPluginManager(options: {
  stateStore: PluginStateStore;
  configStore: PluginConfigStore;
  storageStore: PluginStorageStore;
  secretStore: PluginSecretStore;
  logStore: PluginLogStore;
  fetchImpl: PluginFetch;
  dataProvider: import("@hexo-cms/core").DataProvider;
  diagnosticsHandlers: Record<string, DiagnosticsHandler>;
}): PluginManager {
  return new PluginManager({
    manifests: builtinPluginManifests,
    store: options.stateStore,
    configStore: options.configStore,
    storageStore: options.storageStore,
    secretStore: options.secretStore,
    logStore: options.logStore,
    fetchImpl: options.fetchImpl,
    dataProvider: options.dataProvider,
    diagnosticsHandlers: options.diagnosticsHandlers,
    defaultEnabledPluginIds: [ATTACHMENTS_HELPER_PLUGIN_ID],
    commandHandlers: {
      [`${COMMENTS_OVERVIEW_PLUGIN_ID}:comments.openModeration`]: ({ args }) => {
        const url = typeof args[0] === "string" && args[0] ? args[0] : "/comments";
        if (typeof window !== "undefined") window.location.assign(url);
        return url;
      },
      [`${ATTACHMENTS_HELPER_PLUGIN_ID}:attachments.copyLink`]: async ({ args }) => {
        const value = typeof args[0] === "string" ? args[0] : "";
        if (!value) throw new Error("Attachment link is required.");
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          throw new Error("Failed to copy to clipboard");
        }
        return value;
      },
    },
  });
}

export function PluginProvider({ children }: { children: React.ReactNode }) {
  const dataProvider = useDataProvider();
  const stateStore = useMemo(() => createPlatformPluginStateStore(), []);
  const configStore = useMemo(() => createPlatformPluginConfigStore(), []);
  const storageStore = useMemo(() => createPlatformPluginStorageStore(), []);
  const secretStore = useMemo(() => createPlatformPluginSecretStore(), []);
  const logStore = useMemo(() => createPlatformPluginLogStore(), []);
  const fetchImpl = useMemo(() => createPlatformPluginFetch(), []);

  const manager = useMemo(() => {
    const configsRef = { current: {} as Record<string, PluginConfigValue> };

    const mgr = createDefaultPluginManager({
      stateStore,
      configStore,
      storageStore,
      secretStore,
      logStore,
      fetchImpl,
      dataProvider,
      diagnosticsHandlers: {
        [`${SEO_INSPECTOR_PLUGIN_ID}:seo.post-checks`]: async () => [],
        [`${SEO_INSPECTOR_PLUGIN_ID}:seo.site-checks`]: async () => [],
      },
    });

    // 监听 snapshot 更新以保持配置 ref 最新
    const update = () => {
      const snap = mgr.snapshot();
      configsRef.current = Object.fromEntries(snap.plugins.map(({ manifest, config }) => [manifest.id, config]));
    };
    update();

    // 包装 snapshot 以触发同步
    const originalSnapshot = mgr.snapshot.bind(mgr);
    mgr.snapshot = () => {
      const snap = originalSnapshot();
      configsRef.current = Object.fromEntries(snap.plugins.map(({ manifest, config }) => [manifest.id, config]));
      return snap;
    };

    return mgr;
  }, [configStore, dataProvider, fetchImpl, logStore, secretStore, stateStore, storageStore]);
  const [snapshot, setSnapshot] = useState<PluginManagerSnapshot>(() => manager.snapshot());
  const eventDataProvider = useMemo(
    () =>
      withPluginEvents(dataProvider, async (eventName, payload) => {
        await manager.emitEvent(eventName, payload);
        setSnapshot(manager.snapshot());
      }),
    [dataProvider, manager],
  );

  const enablePlugin = useCallback((pluginId: string) => {
    setSnapshot(manager.enable(pluginId));
  }, [manager]);

  const disablePlugin = useCallback((pluginId: string) => {
    setSnapshot(manager.disable(pluginId));
  }, [manager]);

  const updatePluginConfig = useCallback((pluginId: string, config: PluginConfigValue) => {
    setSnapshot(manager.updatePluginConfig(pluginId, config));
  }, [manager]);

  const recordPluginError = useCallback((pluginId: string, error: PluginRuntimeErrorInput) => {
    setSnapshot(manager.recordPluginError(pluginId, error));
  }, [manager]);

  const executePluginCommand = useCallback(async (pluginId: string, commandId: string, args: unknown[] = []) => {
    const result = await manager.executeCommand(pluginId, commandId, args);
    if (!result.ok && result.error) {
      setSnapshot(
        manager.recordPluginError(pluginId, {
          contributionId: commandId,
          contributionType: "command",
          message: result.error.message,
          code: result.error.code,
        }),
      );
    }
    return result;
  }, [manager]);

  const runDiagnostics = useCallback(async (target: DiagnosticsTarget): Promise<DiagnosticsReport[]> => {
    const reports = await manager.runDiagnostics(target);
    setSnapshot(manager.snapshot());
    return reports;
  }, [manager]);

  const contextValue = useMemo(() => ({
    manager,
    snapshot,
    enablePlugin,
    disablePlugin,
    updatePluginConfig,
    recordPluginError,
    executePluginCommand,
    runDiagnostics,
  }), [manager, snapshot, enablePlugin, disablePlugin, updatePluginConfig, recordPluginError, executePluginCommand, runDiagnostics]);

  return (
    <PluginContext.Provider value={contextValue}>
      <DataProviderProvider provider={eventDataProvider}>{children}</DataProviderProvider>
    </PluginContext.Provider>
  );
}

export function usePluginSystem(): PluginContextValue {
  const value = useContext(PluginContext);
  if (!value) {
    throw new Error("usePluginSystem must be used inside PluginProvider");
  }
  return value;
}

export function usePluginDataProvider() {
  return useDataProvider();
}
