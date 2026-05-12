import { createFileRoute } from "@tanstack/react-router";
import { getAuth, json } from "../../../lib/server-utils";
import { loadPluginState, savePluginState } from "../../../lib/plugin-state-db";
import type { PluginStateStoreValue } from "@hexo-cms/core";

export const Route = createFileRoute("/api/plugin/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        return json({ state: loadPluginState(session.user.id) });
      },
      PUT: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        const body = (await request.json()) as { state?: PluginStateStoreValue };
        savePluginState(session.user.id, body.state ?? {});
        return json({ success: true });
      },
    },
  },
});
