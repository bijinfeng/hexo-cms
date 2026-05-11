import { createFileRoute } from "@tanstack/react-router";
import { listWritableRepositories } from "../../../lib/onboarding-github";
import { getAuth, getGitHubAccessTokenFromAuth, json } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/onboarding/repositories")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "UNAUTHORIZED" }, 401);

        const { auth } = await import("../../../lib/auth");
        const accessToken = await getGitHubAccessTokenFromAuth(auth.api, request.headers);
        if (!accessToken) return json({ error: "REAUTH_REQUIRED" }, 401);

        const { Octokit } = await import("octokit");
        const url = new URL(request.url);
        const repositories = await listWritableRepositories(new Octokit({ auth: accessToken }) as any, {
          query: url.searchParams.get("q") ?? undefined,
        });

        return json({ repositories });
      },
    },
  },
});
