import { createFileRoute } from "@tanstack/react-router";
import { getAuth, getGitHubAccessTokenFromAuth, json } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/auth/token")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        const { auth } = await import("../../../lib/auth");
        const accessToken = await getGitHubAccessTokenFromAuth(auth.api, request.headers);
        if (!accessToken) {
          return json({ error: "REAUTH_REQUIRED" }, 401);
        }
        return json({ authenticated: true });
      },
    },
  },
});
