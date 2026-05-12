import { createFileRoute } from "@tanstack/react-router";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/github/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        try {
          const posts = await ctx.github.getPosts(ctx.config.postsDir);
          return json({
            totalPosts: posts.length,
            publishedPosts: posts.filter((post) => post.frontmatter.draft !== true).length,
            draftPosts: posts.filter((post) => post.frontmatter.draft === true).length,
            totalViews: 0,
          });
        } catch {
          return json({ totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 });
        }
      },
    },
  },
});
