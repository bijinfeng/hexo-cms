import { createContext, useContext, useMemo, useState } from "react";
import {
  ATTACHMENTS_HELPER_PLUGIN_ID,
  COMMENTS_OVERVIEW_PLUGIN_ID,
  BrowserPluginConfigStore,
  BrowserPluginLogStore,
  BrowserPluginStateStore,
  PluginManager,
  builtinPluginManifests,
  type PluginCommandExecutionResult,
  type PluginConfigValue,
  type PluginManagerSnapshot,
  type PluginRuntimeErrorInput,
  type PluginSecretStore,
  type PluginStorageStore,
} from "@hexo-cms/core";
import { DataProviderProvider, useDataProvider } from "../context/data-provider-context";
import { createPlatformPluginSecretStore } from "./platform-plugin-secret";
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
}

const PluginContext = createContext<PluginContextValue | null>(null);

function createDefaultPluginManager(storageStore: PluginStorageStore, secretStore: PluginSecretStore): PluginManager {
  return new PluginManager({
    manifests: builtinPluginManifests,
    store: new BrowserPluginStateStore(),
    configStore: new BrowserPluginConfigStore(),
    storageStore,
    secretStore,
    logStore: new BrowserPluginLogStore(),
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
        await navigator.clipboard.writeText(value);
        return value;
      },
    },
  });
}

export function PluginProvider({ children }: { children: React.ReactNode }) {
  const dataProvider = useDataProvider();
  const storageStore = useMemo(() => createPlatformPluginStorageStore(), []);
  const secretStore = useMemo(() => createPlatformPluginSecretStore(), []);
  const manager = useMemo(() => createDefaultPluginManager(storageStore, secretStore), [secretStore, storageStore]);
  const [snapshot, setSnapshot] = useState<PluginManagerSnapshot>(() => manager.snapshot());
  const eventDataProvider = useMemo(
    () =>
      withPluginEvents(dataProvider, async (eventName, payload) => {
        await manager.emitEvent(eventName, payload);
        setSnapshot(manager.snapshot());
      }),
    [dataProvider, manager],
  );

  function enablePlugin(pluginId: string) {
    setSnapshot(manager.enable(pluginId));
  }

  function disablePlugin(pluginId: string) {
    setSnapshot(manager.disable(pluginId));
  }

  function updatePluginConfig(pluginId: string, config: PluginConfigValue) {
    setSnapshot(manager.updatePluginConfig(pluginId, config));
  }

  function recordPluginError(pluginId: string, error: PluginRuntimeErrorInput) {
    setSnapshot(manager.recordPluginError(pluginId, error));
  }

  async function executePluginCommand(pluginId: string, commandId: string, args: unknown[] = []) {
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
  }

  return (
    <PluginContext.Provider
      value={{
        manager,
        snapshot,
        enablePlugin,
        disablePlugin,
        updatePluginConfig,
        recordPluginError,
        executePluginCommand,
      }}
    >
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
