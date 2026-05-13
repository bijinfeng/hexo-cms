import { createFileRoute } from "@tanstack/react-router";
import { createPluginStoreHandlers } from "../../../lib/server-utils";
import { loadPluginConfig, savePluginConfig } from "../../../lib/plugin-config-db";
import type { PluginConfigStoreValue } from "@hexo-cms/core";

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
