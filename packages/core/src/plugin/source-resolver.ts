import type { PluginDefinition, PluginOrigin } from "./types";

export interface PluginSourceResolver<TRenderer = unknown> {
  readonly origin: PluginOrigin;
  discover(): Promise<Array<PluginDefinition<TRenderer>>>;
}

export interface StaticPluginSourceResolverOptions {
  enabled?: boolean;
}

export class StaticPluginSourceResolver<TRenderer = unknown>
  implements PluginSourceResolver<TRenderer>
{
  readonly origin: PluginOrigin;
  private readonly enabled: boolean;

  constructor(
    origin: PluginOrigin,
    private readonly definitions: Array<PluginDefinition<TRenderer>>,
    options: StaticPluginSourceResolverOptions = {},
  ) {
    this.origin = origin;
    this.enabled = options.enabled ?? true;
  }

  async discover(): Promise<Array<PluginDefinition<TRenderer>>> {
    if (!this.enabled) return [];
    return this.definitions.map((definition) => {
      if (definition.manifest.origin === this.origin) return definition;

      return {
        ...definition,
        manifest: {
          ...definition.manifest,
          origin: this.origin,
        },
      };
    });
  }
}
