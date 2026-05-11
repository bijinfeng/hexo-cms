import { PluginManifestError } from "./errors";
import type { PluginManifest, PluginPermission } from "./types";

const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-_.]+$/;
const VALID_SOURCES = new Set(["builtin", "local-dev"]);
const VALID_PERMISSIONS = new Set<PluginPermission>([
  "content.read",
  "config.read",
  "pluginStorage.read",
  "pluginStorage.write",
  "pluginConfig.write",
  "ui.contribute",
  "command.register",
  "event.subscribe",
  "network.fetch",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new PluginManifestError(`${field} is required`);
  }
}

export function validatePluginManifest(value: unknown): PluginManifest {
  if (!isRecord(value)) throw new PluginManifestError("manifest must be an object");

  assertString(value.id, "id");
  if (!PLUGIN_ID_PATTERN.test(value.id)) {
    throw new PluginManifestError("id must match /^[a-z0-9][a-z0-9-_.]+$/");
  }
  assertString(value.name, "name");
  assertString(value.version, "version");
  assertString(value.description, "description");
  assertString(value.source, "source");
  if (!VALID_SOURCES.has(value.source)) {
    throw new PluginManifestError("source must be builtin or local-dev");
  }

  if (!Array.isArray(value.permissions)) {
    throw new PluginManifestError("permissions must be an array");
  }

  for (const permission of value.permissions) {
    if (typeof permission !== "string" || !VALID_PERMISSIONS.has(permission as PluginPermission)) {
      throw new PluginManifestError(`unknown permission: ${String(permission)}`);
    }
  }

  const manifest = value as unknown as PluginManifest;
  if (manifest.permissions.includes("network.fetch") && !manifest.network?.allowedHosts?.length) {
    throw new PluginManifestError("network.allowedHosts is required when network.fetch is declared");
  }

  return {
    ...manifest,
    permissions: [...new Set(manifest.permissions)],
  };
}

export function validatePluginManifests(values: unknown[]): PluginManifest[] {
  const seen = new Set<string>();
  return values.map((value) => {
    const manifest = validatePluginManifest(value);
    if (seen.has(manifest.id)) {
      throw new PluginManifestError(`duplicate plugin id: ${manifest.id}`);
    }
    seen.add(manifest.id);
    return manifest;
  });
}
