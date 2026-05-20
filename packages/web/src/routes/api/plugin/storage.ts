import type { PluginStorageStoreValue } from "@hexo-cms/core";
import { createFileRoute } from "@tanstack/react-router";
import { loadPluginStorage, savePluginStorage } from "../../../lib/plugin-storage-db";
import { createPluginStoreHandlers } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/plugin/storage")({
  server: {
    handlers: createPluginStoreHandlers<PluginStorageStoreValue>({
      payloadKey: "storage",
      load: loadPluginStorage,
      save: savePluginStorage,
      empty: () => ({}),
    }),
  },
});
