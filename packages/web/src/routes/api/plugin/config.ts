import { createFileRoute } from "@tanstack/react-router";
import { getAuth, json } from "../../../lib/server-utils";
import { loadPluginConfig, savePluginConfig } from "../../../lib/plugin-config-db";
import type { PluginConfigStoreValue } from "@hexo-cms/core";

export const Route = createFileRoute("/api/plugin/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        return json({ config: loadPluginConfig(session.user.id) });
      },
      PUT: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        const body = (await request.json()) as { config?: PluginConfigStoreValue };
        savePluginConfig(session.user.id, body.config ?? {});
        return json({ success: true });
      },
    },
  },
});
