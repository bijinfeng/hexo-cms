import { createFileRoute } from "@tanstack/react-router";
import { getGitHubErrorStatus, listWritableRepositories, type OctokitLike } from "../../../lib/onboarding-github";
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
        try {
          const repositories = await listWritableRepositories(new Octokit({
            auth: accessToken,
            headers: { "X-GitHub-Api-Version": "2022-11-28" },
          }) as OctokitLike, {
            query: url.searchParams.get("q") ?? undefined,
          });

          return json({ repositories });
        } catch (error) {
          const status = getGitHubErrorStatus(error);
          if (status === 401) return json({ error: "REAUTH_REQUIRED" }, 401);
          if (status === 403) return json({ error: "PERMISSION_REQUIRED" }, 403);
          return json({ error: "NETWORK_ERROR" }, 502);
        }
      },
    },
  },
});
