import { createFileRoute } from "@tanstack/react-router";
import { validateHexoRepository, type OctokitLike } from "../../../lib/onboarding-github";
import { getAuth, getGitHubAccessTokenFromAuth, json } from "../../../lib/server-utils";

function isRepositorySelection(input: unknown): input is { owner: string; repo: string; branch?: string } {
  if (typeof input !== "object" || input === null) return false;
  const selection = input as { owner?: unknown; repo?: unknown; branch?: unknown };
  return typeof selection.owner === "string"
    && selection.owner.trim().length > 0
    && typeof selection.repo === "string"
    && selection.repo.trim().length > 0
    && (selection.branch === undefined || typeof selection.branch === "string");
}

export const Route = createFileRoute("/api/onboarding/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "UNAUTHORIZED" }, 401);

        const { auth } = await import("../../../lib/auth");
        const accessToken = await getGitHubAccessTokenFromAuth(auth.api, request.headers);
        if (!accessToken) return json({ error: "REAUTH_REQUIRED" }, 401);

        const selection = await request.json().catch(() => null);
        if (!isRepositorySelection(selection)) {
          return json({ error: "INVALID_REPOSITORY_SELECTION" }, 400);
        }
        const { Octokit } = await import("octokit");
        const validation = await validateHexoRepository(new Octokit({ auth: accessToken }) as OctokitLike, {
          owner: selection.owner.trim(),
          repo: selection.repo.trim(),
          branch: selection.branch?.trim() || undefined,
        });

        if (validation.error === "REAUTH_REQUIRED") {
          return json({ error: "REAUTH_REQUIRED", validation }, 401);
        }

        return json({ validation }, validation.ok ? 200 : 400);
      },
    },
  },
});
