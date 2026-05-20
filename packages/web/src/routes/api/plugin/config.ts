import type { PluginConfigStoreValue } from "@hexo-cms/core";
import { createFileRoute } from "@tanstack/react-router";
import { loadPluginConfig, savePluginConfig } from "../../../lib/plugin-config-db";
import { createPluginStoreHandlers } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/plugin/config")({
  server: {
    handlers: createPluginStoreHandlers<PluginConfigStoreValue>({
      payloadKey: "config",
      load: loadPluginConfig,
      save: savePluginConfig,
      empty: () => ({}),
    }),
  },
});
