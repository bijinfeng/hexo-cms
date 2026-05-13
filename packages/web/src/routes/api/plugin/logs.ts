import { createFileRoute } from "@tanstack/react-router";
import { getAuth, json } from "../../../lib/server-utils";
import { loadPluginLogs, savePluginLogs } from "../../../lib/plugin-log-db";
import type { PluginLogStoreValue } from "@hexo-cms/core";

export const Route = createFileRoute("/api/plugin/logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        return json({ logs: loadPluginLogs(session.user.id) });
      },
      PUT: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        const body = (await request.json()) as { logs?: PluginLogStoreValue };
        savePluginLogs(session.user.id, body.logs ?? {});
        return json({ success: true });
      },
    },
  },
});
