import { createFileRoute } from "@tanstack/react-router";
import { getAuth, json } from "../../../lib/server-utils";
import { loadPluginSecrets, savePluginSecrets } from "../../../lib/plugin-secret-db";
import type { PluginSecretStoreValue } from "@hexo-cms/core";

export const Route = createFileRoute("/api/plugin/secrets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        return json({ secrets: loadPluginSecrets(session.user.id) });
      },
      PUT: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        const body = (await request.json()) as { secrets?: PluginSecretStoreValue };
        savePluginSecrets(session.user.id, body.secrets ?? {});
        return json({ success: true });
      },
    },
  },
});
