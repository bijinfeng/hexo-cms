import { createFileRoute } from "@tanstack/react-router";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/github/config-file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const url = new URL(request.url);
        const path = url.searchParams.get("path");
        if (!path) return json({ error: "MISSING_PATH" }, 400);

        try {
          const file = await ctx.github.getRawFile(path);
          return json({ content: file?.content ?? "" });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Unknown error", content: "" }, 500);
        }
      },

      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const { path, content } = (await request.json()) as { path?: string; content?: string };
        if (!path || content === undefined) return json({ error: "MISSING_PATH_OR_CONTENT" }, 400);

        try {
          await ctx.github.writeRawFile(path, content, `更新配置文件: ${path}`);
          return json({ success: true });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
        }
      },
    },
  },
});
