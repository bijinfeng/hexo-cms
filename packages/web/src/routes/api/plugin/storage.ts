import { createFileRoute } from "@tanstack/react-router";
import { getAuth, json } from "../../../lib/server-utils";
import { loadPluginStorage, savePluginStorage } from "../../../lib/plugin-storage-db";
import type { PluginStorageStoreValue } from "@hexo-cms/core";

export const Route = createFileRoute("/api/plugin/storage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        return json({ storage: loadPluginStorage(session.user.id) });
      },
      PUT: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        const body = (await request.json()) as { storage?: PluginStorageStoreValue };
        savePluginStorage(session.user.id, body.storage ?? {});
        return json({ success: true });
      },
    },
  },
});
