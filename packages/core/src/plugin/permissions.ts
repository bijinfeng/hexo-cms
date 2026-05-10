import { PluginPermissionError } from "./errors";
import type { PluginManifest, PluginPermission } from "./types";

export class PermissionBroker {
  private readonly permissionsByPlugin = new Map<string, Set<PluginPermission>>();

  constructor(manifests: PluginManifest[] = []) {
    manifests.forEach((manifest) => this.register(manifest));
  }

  register(manifest: PluginManifest): void {
    this.permissionsByPlugin.set(manifest.id, new Set(manifest.permissions));
  }

  unregister(pluginId: string): void {
    this.permissionsByPlugin.delete(pluginId);
  }

  has(pluginId: string, permission: PluginPermission): boolean {
    return this.permissionsByPlugin.get(pluginId)?.has(permission) ?? false;
  }

  assert(pluginId: string, permission: PluginPermission, operation: string): void {
    if (!this.has(pluginId, permission)) {
      throw new PluginPermissionError(pluginId, permission, operation);
    }
  }
}
