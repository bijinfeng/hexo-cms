import type { PluginDefinition } from "./types";

export function definePlugin<TRenderer = unknown>(
  definition: PluginDefinition<TRenderer>,
): PluginDefinition<TRenderer> {
  return definition;
}
