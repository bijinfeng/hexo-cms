import type {
  PluginExtensionRegistrySnapshot,
  PluginManifest,
  RegisteredCommand,
  RegisteredDashboardWidget,
  RegisteredDiagnostics,
  RegisteredSettingsPanel,
  RegisteredSidebarItem,
} from "./types";

function byOrderThenTitle<T extends { order?: number; title: string }>(a: T, b: T): number {
  return (a.order ?? 100) - (b.order ?? 100) || a.title.localeCompare(b.title);
}

export class ExtensionRegistry {
  private readonly dashboardWidgets = new Map<string, RegisteredDashboardWidget>();
  private readonly settingsPanels = new Map<string, RegisteredSettingsPanel>();
  private readonly sidebarItems = new Map<string, RegisteredSidebarItem>();
  private readonly commands = new Map<string, RegisteredCommand>();
  private readonly diagnostics = new Map<string, RegisteredDiagnostics>();

  registerPlugin(manifest: PluginManifest): void {
    this.unregisterPlugin(manifest.id);
    const contributes = manifest.contributes;
    if (!contributes) return;

    contributes.dashboardWidgets?.forEach((widget) => {
      this.dashboardWidgets.set(`${manifest.id}:${widget.id}`, {
        ...widget,
        pluginId: manifest.id,
        pluginName: manifest.name,
      });
    });

    contributes.settingsPanels?.forEach((panel) => {
      this.settingsPanels.set(`${manifest.id}:${panel.id}`, {
        ...panel,
        pluginId: manifest.id,
        pluginName: manifest.name,
      });
    });

    contributes.sidebarItems?.forEach((item) => {
      this.sidebarItems.set(`${manifest.id}:${item.id}`, {
        ...item,
        pluginId: manifest.id,
        pluginName: manifest.name,
      });
    });

    contributes.commands?.forEach((command) => {
      this.commands.set(`${manifest.id}:${command.id}`, {
        ...command,
        pluginId: manifest.id,
        pluginName: manifest.name,
      });
    });

    contributes.diagnostics?.forEach((diagnostics) => {
      this.diagnostics.set(`${manifest.id}:${diagnostics.id}`, {
        ...diagnostics,
        pluginId: manifest.id,
        pluginName: manifest.name,
      });
    });
  }

  unregisterPlugin(pluginId: string): void {
    for (const key of this.dashboardWidgets.keys()) {
      if (key.startsWith(`${pluginId}:`)) this.dashboardWidgets.delete(key);
    }
    for (const key of this.settingsPanels.keys()) {
      if (key.startsWith(`${pluginId}:`)) this.settingsPanels.delete(key);
    }
    for (const key of this.sidebarItems.keys()) {
      if (key.startsWith(`${pluginId}:`)) this.sidebarItems.delete(key);
    }
    for (const key of this.commands.keys()) {
      if (key.startsWith(`${pluginId}:`)) this.commands.delete(key);
    }
    for (const key of this.diagnostics.keys()) {
      if (key.startsWith(`${pluginId}:`)) this.diagnostics.delete(key);
    }
  }

  snapshot(): PluginExtensionRegistrySnapshot {
    return {
      dashboardWidgets: [...this.dashboardWidgets.values()].sort(byOrderThenTitle),
      settingsPanels: [...this.settingsPanels.values()].sort(byOrderThenTitle),
      sidebarItems: [...this.sidebarItems.values()].sort(byOrderThenTitle),
      commands: [...this.commands.values()].sort((a, b) => a.title.localeCompare(b.title)),
      diagnostics: [...this.diagnostics.values()].sort((a, b) => a.title.localeCompare(b.title)),
    };
  }
}
