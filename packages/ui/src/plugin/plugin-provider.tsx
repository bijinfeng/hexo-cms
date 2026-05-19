import { createContext, useCallback, useContext, useMemo, useState, type ComponentType } from "react";
import type {
  DiagnosticsReport,
  DiagnosticsTarget,
  PluginCommandExecutionResult,
  PluginConfigValue,
  PluginHost,
  PluginManagerSnapshot,
  PluginRuntimeErrorInput,
  RegisteredDashboardWidget,
} from "@hexo-cms/core";
import { DataProviderProvider, useDataProvider } from "../context/data-provider-context";
import { withPluginEvents } from "./plugin-event-data-provider";

interface PluginContextValue {
  host: PluginHost<ComponentType<{ config?: PluginConfigValue }>>;
  snapshot: PluginManagerSnapshot;
  enablePlugin: (pluginId: string) => void;
  disablePlugin: (pluginId: string) => void;
  updatePluginConfig: (pluginId: string, config: PluginConfigValue) => void;
  recordPluginError: (pluginId: string, error: PluginRuntimeErrorInput) => void;
  executePluginCommand: (pluginId: string, commandId: string, args?: unknown[]) => Promise<PluginCommandExecutionResult>;
  runDiagnostics: (target: DiagnosticsTarget) => Promise<DiagnosticsReport[]>;
  getDashboardWidgetRenderer: (widget: RegisteredDashboardWidget) => ComponentType<{ config?: PluginConfigValue }> | undefined;
}

const PluginContext = createContext<PluginContextValue | null>(null);

export function PluginProvider({
  children,
  host,
}: {
  children: React.ReactNode;
  host: PluginHost<ComponentType<{ config?: PluginConfigValue }>>;
}) {
  const dataProvider = useDataProvider();
  const [snapshot, setSnapshot] = useState<PluginManagerSnapshot>(() => host.snapshot());

  const eventDataProvider = useMemo(
    () =>
      withPluginEvents(dataProvider, async (eventName, payload) => {
        await host.emitEvent(eventName, payload);
        setSnapshot(host.snapshot());
      }),
    [dataProvider, host],
  );

  const enablePlugin = useCallback((pluginId: string) => {
    setSnapshot(host.enablePlugin(pluginId));
  }, [host]);

  const disablePlugin = useCallback((pluginId: string) => {
    setSnapshot(host.disablePlugin(pluginId));
  }, [host]);

  const updatePluginConfig = useCallback((pluginId: string, config: PluginConfigValue) => {
    setSnapshot(host.updatePluginConfig(pluginId, config));
  }, [host]);

  const recordPluginError = useCallback((pluginId: string, error: PluginRuntimeErrorInput) => {
    setSnapshot(host.recordPluginError(pluginId, error));
  }, [host]);

  const executePluginCommand = useCallback(async (pluginId: string, commandId: string, args: unknown[] = []) => {
    const result = await host.executePluginCommand(pluginId, commandId, args);
    if (!result.ok && result.error) {
      setSnapshot(host.recordPluginError(pluginId, {
        contributionId: commandId,
        contributionType: "command",
        message: result.error.message,
        code: result.error.code,
      }));
    }
    return result;
  }, [host]);

  const runDiagnostics = useCallback(async (target: DiagnosticsTarget): Promise<DiagnosticsReport[]> => {
    const reports = await host.runDiagnostics(target);
    setSnapshot(host.snapshot());
    return reports;
  }, [host]);

  const getDashboardWidgetRenderer = useCallback(
    (widget: RegisteredDashboardWidget) => host.getDashboardWidgetRenderer(widget),
    [host],
  );

  const contextValue = useMemo(() => ({
    host,
    snapshot,
    enablePlugin,
    disablePlugin,
    updatePluginConfig,
    recordPluginError,
    executePluginCommand,
    runDiagnostics,
    getDashboardWidgetRenderer,
  }), [host, snapshot, enablePlugin, disablePlugin, updatePluginConfig, recordPluginError, executePluginCommand, runDiagnostics, getDashboardWidgetRenderer]);

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
