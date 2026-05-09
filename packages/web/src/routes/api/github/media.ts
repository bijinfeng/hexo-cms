import { createFileRoute } from "@tanstack/react-router";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/github/media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        try {
          const { data: contents } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: ctx.config.media_dir || "source/images" });
          return json({ media: Array.isArray(contents) ? contents.filter((f: any) => /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(f.name)).map((f: any) => ({ name: f.name, path: f.path, url: f.download_url, size: f.size })) : [] });
        } catch { return json({ media: [] }); }
      },
    },
  },
});
