import { createFileRoute } from "@tanstack/react-router";
import { createPluginStoreHandlers } from "../../../lib/server-utils";
import { loadPluginLogs, savePluginLogs } from "../../../lib/plugin-log-db";
import type { PluginLogStoreValue } from "@hexo-cms/core";

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
