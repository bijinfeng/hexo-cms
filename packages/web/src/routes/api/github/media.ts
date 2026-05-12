import { createFileRoute } from "@tanstack/react-router";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

const MEDIA_FILE_PATTERN = /\.(png|jpg|jpeg|gif|svg|webp|ico|avif|mp4|webm|mov|mp3|wav|ogg|flac|pdf|doc|docx)$/i;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const Route = createFileRoute("/api/github/media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        try {
          const files = (await ctx.github.getMediaFiles(ctx.config.mediaDir))
            .filter((file) => MEDIA_FILE_PATTERN.test(file.name))
            .map((file) => ({
              name: file.name,
              path: file.path,
              size: file.size,
              sha: file.sha,
              url: `https://raw.githubusercontent.com/${ctx.config.owner}/${ctx.config.repo}/${ctx.config.branch ?? "main"}/${file.path}`,
            }));
          return json({ files });
        } catch (error) {
          return json({ error: getErrorMessage(error), files: [] }, 500);
        }
      },

      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const formData = await request.formData();
        const file = formData.get("file");
        const path = formData.get("path");

        if (!(file instanceof File) || typeof path !== "string" || !path.trim()) {
          return json({ error: "INVALID_MEDIA_UPLOAD" }, 400);
        }

        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const result = await ctx.github.uploadMedia(path, Buffer.from(bytes).toString("base64"), file.name);
          return json(result);
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },

      DELETE: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const { path } = (await request.json()) as { path?: string };
        if (!path) return json({ error: "INVALID_PATH" }, 400);

        try {
          await ctx.github.deleteMedia(path);
          return json({ success: true });
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },
    },
  },
});
