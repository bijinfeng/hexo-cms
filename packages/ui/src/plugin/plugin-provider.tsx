import { createContext, useContext, useMemo, useState } from "react";
import {
  ATTACHMENTS_HELPER_PLUGIN_ID,
  BrowserPluginConfigStore,
  BrowserPluginStateStore,
  PluginManager,
  builtinPluginManifests,
  type PluginConfigValue,
  type PluginManagerSnapshot,
} from "@hexo-cms/core";
import { useDataProvider } from "../context/data-provider-context";

interface PluginContextValue {
  manager: PluginManager;
  snapshot: PluginManagerSnapshot;
  enablePlugin: (pluginId: string) => void;
  disablePlugin: (pluginId: string) => void;
  updatePluginConfig: (pluginId: string, config: PluginConfigValue) => void;
}

const PluginContext = createContext<PluginContextValue | null>(null);

function createDefaultPluginManager(): PluginManager {
  return new PluginManager({
    manifests: builtinPluginManifests,
    store: new BrowserPluginStateStore(),
    configStore: new BrowserPluginConfigStore(),
    defaultEnabledPluginIds: [ATTACHMENTS_HELPER_PLUGIN_ID],
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

  return (
    <PluginContext.Provider value={{ manager, snapshot, enablePlugin, disablePlugin, updatePluginConfig }}>
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
