import { createFileRoute } from "@tanstack/react-router";
import { json, getAuth } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/auth/token")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        return json({ token: (session as any).session?.token || null });
      },
    },
  },
});
