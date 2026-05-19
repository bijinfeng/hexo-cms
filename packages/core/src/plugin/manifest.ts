import { PluginManifestError } from "./errors";
import type { PluginManifest, PluginOrigin, PluginPermission, PluginRuntime } from "./types";

const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-_.]+$/;
const VALID_ORIGINS = new Set<PluginOrigin>(["official", "local-dev", "private", "marketplace"]);
const VALID_RUNTIMES = new Set<PluginRuntime>(["hosted", "worker", "iframe"]);
const VALID_PERMISSIONS = new Set<PluginPermission>([
  "content.read",
  "config.read",
  "pluginStorage.read",
  "pluginStorage.write",
  "pluginSecret.read",
  "pluginSecret.write",
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
  if ("source" in value) {
    throw new PluginManifestError("source is not supported");
  }
  assertString(value.origin, "origin");
  if (!VALID_ORIGINS.has(value.origin as PluginOrigin)) {
    throw new PluginManifestError("origin must be official, local-dev, private, or marketplace");
  }
  assertString(value.runtime, "runtime");
  if (!VALID_RUNTIMES.has(value.runtime as PluginRuntime)) {
    throw new PluginManifestError("runtime must be hosted, worker, or iframe");
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
