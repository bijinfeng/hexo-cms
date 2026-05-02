import { createFileRoute } from "@tanstack/react-router";
import { json, getGitHubCtx } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/github/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx) return json({ error: "Not configured" }, 404);
        try {
          const { data: contents } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: ctx.config.posts_dir || "source/_posts" });
          const posts = Array.isArray(contents) ? contents.filter((f: any) => f.name.endsWith(".md")) : [];
          return json({ totalPosts: posts.length, publishedPosts: posts.length, draftPosts: 0 });
        } catch { return json({ totalPosts: 0, publishedPosts: 0, draftPosts: 0 }); }
      },
    },
  },
});
