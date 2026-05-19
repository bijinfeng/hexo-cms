import { PluginManifestError } from "./errors";
import { validatePluginManifest } from "./manifest";
import type { PluginDefinition, PluginManifest } from "./types";
import type { PluginSourceResolver } from "./source-resolver";

export class PluginCatalog<TRenderer = unknown> {
  private constructor(
    private readonly pluginDefinitions: Array<PluginDefinition<TRenderer>>,
    private readonly pluginManifests: PluginManifest[],
    private readonly definitionsById: Map<string, PluginDefinition<TRenderer>>,
    private readonly manifestsById: Map<string, PluginManifest>,
  ) {}

  static async discover<TRenderer = unknown>(
    resolvers: Array<PluginSourceResolver<TRenderer>>,
  ): Promise<PluginCatalog<TRenderer>> {
    const definitions: Array<PluginDefinition<TRenderer>> = [];
    const manifests: PluginManifest[] = [];
    const definitionsById = new Map<string, PluginDefinition<TRenderer>>();
    const manifestsById = new Map<string, PluginManifest>();

    for (const resolver of resolvers) {
      const discovered = await resolver.discover();

      for (const definition of discovered) {
        const manifest = validatePluginManifest(definition.manifest);
        if (manifest.runtime !== "hosted") {
          throw new PluginManifestError(`unsupported plugin runtime: ${manifest.runtime}`);
        }
        if (definitionsById.has(manifest.id)) {
          throw new PluginManifestError(`duplicate plugin id: ${manifest.id}`);
        }

        definitions.push(definition);
        manifests.push(manifest);
        definitionsById.set(manifest.id, definition);
        manifestsById.set(manifest.id, manifest);
      }
    }

    return new PluginCatalog(definitions, manifests, definitionsById, manifestsById);
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
