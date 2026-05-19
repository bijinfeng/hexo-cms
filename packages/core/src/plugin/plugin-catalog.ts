import { PluginManifestError } from "./errors";
import { validatePluginManifest } from "./manifest";
import type { PluginDefinition, PluginManifest } from "./types";
import type { PluginSourceResolver } from "./source-resolver";

export class PluginCatalog<TRenderer = unknown> {
  private readonly pluginDefinitions: Array<PluginDefinition<TRenderer>>;
  private readonly pluginManifests: PluginManifest[];
  private readonly definitionsById = new Map<string, PluginDefinition<TRenderer>>();
  private readonly manifestsById = new Map<string, PluginManifest>();

  constructor(definitions: Array<PluginDefinition<TRenderer>>) {
    this.pluginDefinitions = [];
    this.pluginManifests = [];

    for (const definition of definitions) {
      const manifest = validatePluginManifest(definition.manifest);
      if (manifest.runtime !== "hosted") {
        throw new PluginManifestError(`unsupported plugin runtime: ${manifest.runtime}`);
      }
      if (this.definitionsById.has(manifest.id)) {
        throw new PluginManifestError(`duplicate plugin id: ${manifest.id}`);
      }
      const normalized = { ...definition, manifest };
      this.pluginDefinitions.push(normalized);
      this.pluginManifests.push(manifest);
      this.definitionsById.set(manifest.id, normalized);
      this.manifestsById.set(manifest.id, manifest);
    }
  }

  static async discover<TRenderer = unknown>(
    resolvers: Array<PluginSourceResolver<TRenderer>>,
  ): Promise<PluginCatalog<TRenderer>> {
    const definitions: Array<PluginDefinition<TRenderer>> = [];

    for (const resolver of resolvers) {
      try {
        const discovered = await resolver.discover();
        definitions.push(...discovered);
      } catch (error) {
        console.error(`Plugin resolver failed to discover plugins:`, error);
      }
    }

    return new PluginCatalog(definitions);
  }

  definitions(): Array<PluginDefinition<TRenderer>> {
    return [...this.pluginDefinitions];
  }

  manifests(): PluginManifest[] {
    return [...this.pluginManifests];
  }

  getDefinition(pluginId: string): PluginDefinition<TRenderer> | undefined {
    return this.definitionsById.get(pluginId);
  }

  getManifest(pluginId: string): PluginManifest | undefined {
    return this.manifestsById.get(pluginId);
  }

  defaultEnabledPluginIds(): string[] {
    return this.pluginDefinitions
      .filter((definition) => definition.defaultEnabled)
      .map((definition) => definition.manifest.id);
  }
}
