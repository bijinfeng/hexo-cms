import { createFileRoute } from "@tanstack/react-router";
import { createPluginStoreHandlers } from "../../../lib/server-utils";
import { loadPluginStorage, savePluginStorage } from "../../../lib/plugin-storage-db";
import type { PluginStorageStoreValue } from "@hexo-cms/core";

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
