import { createFileRoute } from "@tanstack/react-router";
import { getAuth, json } from "../../../lib/server-utils";
import { deletePluginSecret, hasPluginSecret, setPluginSecret } from "../../../lib/plugin-secret-db";

type PluginSecretOperation =
  | { op: "has"; pluginId?: string; key?: string }
  | { op: "set"; pluginId?: string; key?: string; value?: string }
  | { op: "delete"; pluginId?: string; key?: string };

function getSecretTarget(pluginId: unknown, key: unknown): { pluginId: string; key: string } | null {
  if (
    typeof pluginId === "string" && pluginId.trim().length > 0
    && typeof key === "string" && key.trim().length > 0
  ) {
    return { pluginId, key };
  }
  return null;
}

export const Route = createFileRoute("/api/plugin/secrets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);

        const url = new URL(request.url);
        const pluginId = url.searchParams.get("pluginId");
        const key = url.searchParams.get("key");
        const target = getSecretTarget(pluginId, key);
        if (!target) return json({ error: "Invalid secret target" }, 400);

        return json({ configured: hasPluginSecret(session.user.id, target.pluginId, target.key) });
      },

      PUT: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);

        const body = (await request.json()) as PluginSecretOperation;
        const target = getSecretTarget(body.pluginId, body.key);
        if (!target) return json({ error: "Invalid secret target" }, 400);

        if (body.op === "has") {
          return json({ configured: hasPluginSecret(session.user.id, target.pluginId, target.key) });
        }

        if (body.op === "set") {
          if (typeof body.value !== "string" || body.value.length === 0) {
            return json({ error: "Invalid secret value" }, 400);
          }
          setPluginSecret(session.user.id, target.pluginId, target.key, body.value);
          return json({ success: true });
        }

        if (body.op === "delete") {
          deletePluginSecret(session.user.id, target.pluginId, target.key);
          return json({ success: true });
        }

        return json({ error: "Invalid secret operation" }, 400);
      },
    },
  },
});
