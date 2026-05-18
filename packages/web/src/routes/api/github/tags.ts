import { createFileRoute } from "@tanstack/react-router";
import { getErrorMessage } from "@hexo-cms/core";
import {
  summarizeTaxonomies,
  renameTaxonomy,
  deleteTaxonomy,
  mergeTaxonomy,
  type TaxonomyType,
  type TaxonomyRepository,
} from "@hexo-cms/core";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/github/tags")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        try {
          const posts = await ctx.github.getPosts(ctx.config.postsDir);
          const summary = summarizeTaxonomies(posts);
          return json({ tags: summary.tags, categories: summary.categories, total: summary.total });
        } catch (error) {
          return json({ error: getErrorMessage(error), tags: [], categories: [], total: 0 }, 500);
        }
      },

      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const body = (await request.json()) as { type?: TaxonomyType; oldName?: string; newName?: string };
        if ((body.type !== "tag" && body.type !== "category") || !body.oldName || !body.newName) {
          return json({ error: "INVALID_TAXONOMY_RENAME" }, 400);
        }

        try {
          const repo: TaxonomyRepository = {
            getPosts: () => ctx.github.getPosts(ctx.config.postsDir),
            savePost: (post) => ctx.github.savePost(post),
          };
          const result = await renameTaxonomy(repo, { type: body.type, oldName: body.oldName, newName: body.newName });
          return json(result);
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },

      DELETE: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const body = (await request.json()) as { type?: TaxonomyType; name?: string };
        if ((body.type !== "tag" && body.type !== "category") || !body.name) {
          return json({ error: "INVALID_TAXONOMY_DELETE" }, 400);
        }

        try {
          const repo: TaxonomyRepository = {
            getPosts: () => ctx.github.getPosts(ctx.config.postsDir),
            savePost: (post) => ctx.github.savePost(post),
          };
          const result = await deleteTaxonomy(repo, { type: body.type, name: body.name });
          return json(result);
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },

      PUT: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const body = (await request.json()) as { type?: TaxonomyType; sourceName?: string; targetName?: string };
        if ((body.type !== "tag" && body.type !== "category") || !body.sourceName || !body.targetName) {
          return json({ error: "INVALID_TAXONOMY_MERGE" }, 400);
        }

        try {
          const repo: TaxonomyRepository = {
            getPosts: () => ctx.github.getPosts(ctx.config.postsDir),
            savePost: (post) => ctx.github.savePost(post),
          };
          const result = await mergeTaxonomy(repo, { type: body.type, sourceName: body.sourceName, targetName: body.targetName });
          return json(result);
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },
    },
  },
});
