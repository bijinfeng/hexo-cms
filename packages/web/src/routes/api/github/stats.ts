import { createAPIFileRoute } from "@tanstack/react-start/api";
import { auth } from "../../../lib/auth";
import { GitHubService } from "@hexo-cms/core";

export const APIRoute = createAPIFileRoute("/api/github/stats")({
  GET: async ({ request }) => {
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
    const token = url.searchParams.get("token");

    if (!owner || !repo || !token) {
      return new Response(
        JSON.stringify({ error: "Missing owner, repo, or token" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const github = new GitHubService(token, { owner, repo });
      const posts = await github.getPosts();

      // Calculate stats
      const totalPosts = posts.length;
      const publishedPosts = posts.filter(p => !p.frontmatter.draft).length;
      const draftPosts = posts.filter(p => p.frontmatter.draft).length;

      // Aggregate tags
      const tagSet = new Set<string>();
      for (const post of posts) {
        const tags = post.frontmatter.tags;
        if (Array.isArray(tags)) {
          tags.forEach(tag => tagSet.add(tag));
        } else if (typeof tags === "string") {
          tagSet.add(tags);
        }
      }

      // Aggregate categories
      const categorySet = new Set<string>();
      for (const post of posts) {
        const category = post.frontmatter.category;
        if (category) {
          categorySet.add(category);
        }
      }

      // Get recent posts (last 5)
      const recentPosts = posts
        .sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime())
        .slice(0, 5)
        .map(p => ({
          title: p.title,
          slug: p.path.replace(/^source\/_posts\//, "").replace(/\.md$/, ""),
          date: p.frontmatter.date,
          status: p.frontmatter.draft ? "draft" : "published",
        }));

      return new Response(
        JSON.stringify({
          totalPosts,
          publishedPosts,
          draftPosts,
          totalTags: tagSet.size,
          totalCategories: categorySet.size,
          recentPosts,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Failed to fetch stats" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
