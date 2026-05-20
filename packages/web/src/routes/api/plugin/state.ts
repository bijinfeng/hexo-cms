import type { PluginStateStoreValue } from "@hexo-cms/core";
import { createFileRoute } from "@tanstack/react-router";
import { loadPluginState, savePluginState } from "../../../lib/plugin-state-db";
import { createPluginStoreHandlers } from "../../../lib/server-utils";

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
