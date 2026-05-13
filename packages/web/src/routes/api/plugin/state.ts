import { createFileRoute } from "@tanstack/react-router";
import { createPluginStoreHandlers } from "../../../lib/server-utils";
import { loadPluginState, savePluginState } from "../../../lib/plugin-state-db";
import type { PluginStateStoreValue } from "@hexo-cms/core";

export const Route = createFileRoute("/api/plugin/state")({
  server: {
    handlers: createPluginStoreHandlers<PluginStateStoreValue>({
      payloadKey: "state",
      load: loadPluginState,
      save: savePluginState,
      empty: () => ({}),
    }),
  },
});
