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

  POST: async ({ request }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await request.json();
      const { owner, repo, token, type, oldName, newName } = body;

      if (!owner || !repo || !token || !type || !oldName || !newName) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (type !== "tag" && type !== "category") {
        return new Response(
          JSON.stringify({ error: "Invalid type, must be 'tag' or 'category'" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const github = new GitHubService(token, { owner, repo });
      const posts = await github.getPosts();

      let updatedCount = 0;

      for (const post of posts) {
        let modified = false;
        const frontmatter = { ...post.frontmatter };

        if (type === "tag") {
          const tags = frontmatter.tags;
          if (Array.isArray(tags)) {
            const index = tags.indexOf(oldName);
            if (index !== -1) {
              tags[index] = newName;
              frontmatter.tags = tags;
              modified = true;
            }
          } else if (tags === oldName) {
            frontmatter.tags = newName;
            modified = true;
          }
        } else {
          const category = frontmatter.category || frontmatter.categories;
          if (typeof category === "string" && category === oldName) {
            if (frontmatter.category) frontmatter.category = newName;
            if (frontmatter.categories) frontmatter.categories = newName;
            modified = true;
          } else if (Array.isArray(category)) {
            const index = category.indexOf(oldName);
            if (index !== -1) {
              category[index] = newName;
              if (frontmatter.category) frontmatter.category = category;
              if (frontmatter.categories) frontmatter.categories = category;
              modified = true;
            }
          }
        }

        if (modified) {
          await github.savePost({
            ...post,
            frontmatter,
          });
          updatedCount++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, updatedCount }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Failed to rename tag/category:", error);
      return new Response(
        JSON.stringify({ error: "Failed to rename tag/category" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  DELETE: async ({ request }) => {
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
      const token = url.searchParams.get("token");
      const type = url.searchParams.get("type");
      const name = url.searchParams.get("name");

      if (!owner || !repo || !token || !type || !name) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (type !== "tag" && type !== "category") {
        return new Response(
          JSON.stringify({ error: "Invalid type, must be 'tag' or 'category'" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const github = new GitHubService(token, { owner, repo });
      const posts = await github.getPosts();

      let updatedCount = 0;

      for (const post of posts) {
        let modified = false;
        const frontmatter = { ...post.frontmatter };

        if (type === "tag") {
          const tags = frontmatter.tags;
          if (Array.isArray(tags)) {
            const filtered = tags.filter((t) => t !== name);
            if (filtered.length !== tags.length) {
              frontmatter.tags = filtered.length > 0 ? filtered : undefined;
              modified = true;
            }
          } else if (tags === name) {
            frontmatter.tags = undefined;
            modified = true;
          }
        } else {
          const category = frontmatter.category || frontmatter.categories;
          if (typeof category === "string" && category === name) {
            frontmatter.category = undefined;
            frontmatter.categories = undefined;
            modified = true;
          } else if (Array.isArray(category)) {
            const filtered = category.filter((c) => c !== name);
            if (filtered.length !== category.length) {
              if (frontmatter.category) {
                frontmatter.category = filtered.length > 0 ? filtered : undefined;
              }
              if (frontmatter.categories) {
                frontmatter.categories = filtered.length > 0 ? filtered : undefined;
              }
              modified = true;
            }
          }
        }

        if (modified) {
          await github.savePost({
            ...post,
            frontmatter,
          });
          updatedCount++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, updatedCount }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Failed to delete tag/category:", error);
      return new Response(
        JSON.stringify({ error: "Failed to delete tag/category" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
