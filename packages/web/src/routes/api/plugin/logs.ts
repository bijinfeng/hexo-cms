import type { PluginLogStoreValue } from "@hexo-cms/core";
import { createFileRoute } from "@tanstack/react-router";
import { loadPluginLogs, savePluginLogs } from "../../../lib/plugin-log-db";
import { createPluginStoreHandlers } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/plugin/logs")({
  server: {
    handlers: createPluginStoreHandlers<PluginLogStoreValue>({
      payloadKey: "logs",
      load: loadPluginLogs,
      save: savePluginLogs,
      empty: () => ({}),
    }),
  },
});
