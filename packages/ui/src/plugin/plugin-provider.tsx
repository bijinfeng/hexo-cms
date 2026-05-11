import { createContext, useContext, useMemo, useState } from "react";
import {
  ATTACHMENTS_HELPER_PLUGIN_ID,
  COMMENTS_OVERVIEW_PLUGIN_ID,
  BrowserPluginConfigStore,
  BrowserPluginStorageStore,
  BrowserPluginStateStore,
  PluginManager,
  builtinPluginManifests,
  type PluginCommandExecutionResult,
  type PluginConfigValue,
  type PluginManagerSnapshot,
  type PluginRuntimeErrorInput,
} from "@hexo-cms/core";
import { useDataProvider } from "../context/data-provider-context";

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

function createDefaultPluginManager(): PluginManager {
  return new PluginManager({
    manifests: builtinPluginManifests,
    store: new BrowserPluginStateStore(),
    configStore: new BrowserPluginConfigStore(),
    storageStore: new BrowserPluginStorageStore(),
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
  const manager = useMemo(() => createDefaultPluginManager(), []);
  const [snapshot, setSnapshot] = useState<PluginManagerSnapshot>(() => manager.snapshot());

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
      {children}
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
