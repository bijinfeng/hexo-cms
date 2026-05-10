export class PluginManifestError extends Error {
  readonly code = "PLUGIN_MANIFEST_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "PluginManifestError";
  }
}

export class PluginPermissionError extends Error {
  readonly code = "PLUGIN_PERMISSION_DENIED";

  constructor(
    readonly pluginId: string,
    readonly permission: string,
    readonly operation: string,
  ) {
    super(`Plugin ${pluginId} is missing permission ${permission} for ${operation}`);
    this.name = "PluginPermissionError";
  }
}

export class PluginNotFoundError extends Error {
  readonly code = "PLUGIN_NOT_FOUND";

  constructor(pluginId: string) {
    super(`Plugin ${pluginId} was not found`);
    this.name = "PluginNotFoundError";
  }
}
