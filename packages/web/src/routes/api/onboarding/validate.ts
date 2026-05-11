import { createFileRoute } from "@tanstack/react-router";
import { validateHexoRepository } from "../../../lib/onboarding-github";
import { getAuth, getGitHubAccessTokenFromAuth, json } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/onboarding/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "UNAUTHORIZED" }, 401);

        const { auth } = await import("../../../lib/auth");
        const accessToken = await getGitHubAccessTokenFromAuth(auth.api, request.headers);
        if (!accessToken) return json({ error: "REAUTH_REQUIRED" }, 401);

        const selection = await request.json();
        const { Octokit } = await import("octokit");
        const validation = await validateHexoRepository(new Octokit({ auth: accessToken }) as any, selection);

        return json({ validation }, validation.ok ? 200 : 400);
      },
    },
  },
});
