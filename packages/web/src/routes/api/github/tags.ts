import { createAPIFileRoute } from "@tanstack/react-start/api";
import { GitHubService } from "@hexo-cms/core";
import { auth } from "../../lib/auth";

export const APIRoute = createAPIFileRoute("/api/github/tags")({
  GET: async ({ request }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const url = new URL(request.url);
      const owner = url.searchParams.get("owner");
      const repo = url.searchParams.get("repo");
      const accessToken = url.searchParams.get("token");

      if (!owner || !repo || !accessToken) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const github = new GitHubService(accessToken, { owner, repo });
      const posts = await github.getPosts();

      // Aggregate tags and categories from all posts
      const tagMap = new Map<string, number>();
      const categoryMap = new Map<string, number>();

      for (const post of posts) {
        const tags = post.frontmatter.tags;
        if (Array.isArray(tags)) {
          for (const tag of tags) {
            tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
          }
        } else if (typeof tags === "string" && tags) {
          tagMap.set(tags, (tagMap.get(tags) || 0) + 1);
        }

        const category = post.frontmatter.category || post.frontmatter.categories;
        if (typeof category === "string" && category) {
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        } else if (Array.isArray(category)) {
          for (const cat of category) {
            if (typeof cat === "string") {
              categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
            }
          }
        }
      }

      const tags = Array.from(tagMap.entries())
        .map(([name, count], i) => ({ id: String(i + 1), name, slug: name.toLowerCase().replace(/\s+/g, "-"), count }))
        .sort((a, b) => b.count - a.count);

      const categories = Array.from(categoryMap.entries())
        .map(([name, count], i) => ({ id: String(i + 1), name, slug: name.toLowerCase().replace(/\s+/g, "-"), count }))
        .sort((a, b) => b.count - a.count);

      return new Response(JSON.stringify({ tags, categories, total: posts.length }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tags" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
