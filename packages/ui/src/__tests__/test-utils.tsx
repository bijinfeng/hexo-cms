import { vi } from "vitest";
import type { ComponentType } from "react";
import type { PluginHost, PluginConfigValue } from "@hexo-cms/core";

/**
 * Creates a mock PluginHost for testing
 */
export function createMockPluginHost(): PluginHost<ComponentType<{ config?: PluginConfigValue }>> {
  return {
    snapshot: vi.fn(() => ({
      plugins: [],
      extensions: {
        commands: [],
        diagnostics: [],
        dashboardWidgets: [],
        events: [],
      },
    })),
    manifests: vi.fn(() => []),
    getManifest: vi.fn(() => undefined),
    enablePlugin: vi.fn(async () => ({
      plugins: [],
      extensions: {
        commands: [],
        diagnostics: [],
        dashboardWidgets: [],
        events: [],
      },
    })),
    disablePlugin: vi.fn(async () => ({
      plugins: [],
      extensions: {
        commands: [],
        diagnostics: [],
        dashboardWidgets: [],
        events: [],
      },
    })),
    updatePluginConfig: vi.fn(() => ({
      plugins: [],
      extensions: {
        commands: [],
        diagnostics: [],
        dashboardWidgets: [],
        events: [],
      },
    })),
    recordPluginError: vi.fn(async () => ({
      plugins: [],
      extensions: {
        commands: [],
        diagnostics: [],
        dashboardWidgets: [],
        events: [],
      },
    })),
    executePluginCommand: vi.fn(async () => ({ ok: true, result: undefined })),
    runDiagnostics: vi.fn(async () => []),
    emitEvent: vi.fn(async () => []),
    getDashboardWidgetRenderer: vi.fn(() => undefined),
  } as unknown as PluginHost<ComponentType<{ config?: PluginConfigValue }>>;
}
