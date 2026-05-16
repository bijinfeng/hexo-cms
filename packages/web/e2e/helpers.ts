import type { Page, Route } from "@playwright/test";

export async function mockAuthAsAnonymous(page: Page) {
  await page.route("**/api/auth/**", (route: Route) => {
    const url = route.request().url();
    // Mock session endpoint - return anonymous
    if (url.includes("/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: null, session: null }),
      });
    }
    // Mock token endpoint
    if (url.includes("/token")) {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "UNAUTHORIZED" }),
      });
    }
    // Default: return ok for other auth routes
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

export async function mockAuthAsAuthenticated(page: Page) {
  await page.route("**/api/auth/**", (route: Route) => {
    const url = route.request().url();
    if (url.includes("/session") || url.includes("get-session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            name: "Test User",
            email: "test@example.com",
            image: "https://avatars.githubusercontent.com/u/1?v=4",
          },
          session: {
            id: "test-session-id",
            userId: "test-user-id",
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
        }),
      });
    }
    if (url.includes("/token")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ authenticated: true }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

export function mockGitHubConfig(page: Page) {
  return page.route("**/api/github/config", (route: Route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          config: {
            owner: "test-user",
            repo: "test-blog",
            branch: "main",
            postsDir: "source/_posts",
            mediaDir: "source/images",
            workflowFile: ".github/workflows/deploy.yml",
            autoDeploy: true,
            deployNotifications: true,
          },
        }),
      });
    } else if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    } else {
      route.continue();
    }
  });
}

export function mockStats(page: Page) {
  return page.route("**/api/github/stats", (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        totalPosts: 10,
        publishedPosts: 7,
        draftPosts: 3,
        totalViews: 0,
      }),
    });
  });
}

export function mockPosts(page: Page) {
  return page.route("**/api/github/posts**", (route: Route) => {
    if (route.request().method() === "GET") {
      const url = route.request().url();
      const urlObj = new URL(url);
      const pathParam = urlObj.searchParams.get("path");

      if (pathParam) {
        const title = pathParam.split("/").pop()?.replace(".md", "") || "Untitled";
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            post: {
              path: pathParam,
              title,
              date: "2026-01-01",
              content: `# ${title}\n\nPost content for ${title}.`,
              frontmatter: { title, date: "2026-01-01", tags: ["test"], draft: false },
            },
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            posts: [
              {
                path: "source/_posts/hello-world.md",
                title: "Hello World",
                date: "2026-01-01",
                content: "This is my first post.",
                frontmatter: { title: "Hello World", date: "2026-01-01", tags: ["intro"], draft: false },
              },
              {
                path: "source/_posts/tanstack-guide.md",
                title: "TanStack Start Guide",
                date: "2026-03-15",
                content: "A comprehensive guide.",
                frontmatter: { title: "TanStack Start Guide", date: "2026-03-15", tags: ["react"], draft: false },
              },
              {
                path: "source/_posts/draft-post.md",
                title: "Draft Post",
                date: "2026-05-01",
                content: "Still a draft.",
                frontmatter: { title: "Draft Post", date: "2026-05-01", draft: true },
              },
            ],
          }),
        });
      }
    } else {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
}

export function mockPages(page: Page) {
  return page.route("**/api/github/pages", (route: Route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          pages: [
            {
              path: "source/about/index.md",
              title: "About",
              date: "2026-01-01",
              content: "About this blog.",
              frontmatter: { title: "About", draft: false },
            },
          ],
        }),
      });
    } else {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
}

export function mockTags(page: Page) {
  return page.route("**/api/github/tags", (route: Route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tags: [
            { id: "1", name: "react", slug: "react", count: 2 },
            { id: "2", name: "intro", slug: "intro", count: 1 },
          ],
          categories: [{ id: "1", name: "tech", slug: "tech", count: 2 }],
          total: 3,
        }),
      });
    } else {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ updatedCount: 1 }) });
    }
  });
}

export function mockMedia(page: Page) {
  return page.route("**/api/github/media", (route: Route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            { name: "hero.png", path: "source/images/hero.png", size: 102400, url: "https://example.com/hero.png", sha: "abc" },
            { name: "photo.jpg", path: "source/images/photo.jpg", size: 204800, url: "https://example.com/photo.jpg", sha: "def" },
          ],
        }),
      });
    } else {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
}

export function mockThemes(page: Page) {
  return page.route("**/api/github/themes", (route: Route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          currentTheme: "landscape",
          installedThemes: [
            { name: "landscape", path: "themes/landscape" },
            { name: "next", path: "themes/next" },
          ],
        }),
      });
    } else {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
}

export function mockDeploy(page: Page) {
  return page.route("**/api/deploy", (route: Route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          deployments: [
            { id: "1", status: "success", createdAt: "2026-05-15T10:00:00Z", duration: 45000, conclusion: "success" },
          ],
        }),
      });
    } else {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
}

export function mockConfigFile(page: Page) {
  return page.route("**/api/github/config-file**", (route: Route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            "menu:",
            "  home: / || home",
            "  archives: /archives/ || archive",
            "  tags: /tags/ || tags",
            "  about: /about/ || user",
            "",
            "theme: landscape",
          ].join("\n"),
        }),
      });
    } else {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
}

export function mockPluginApi(page: Page) {
  return page.route("**/api/plugin/**", (route: Route) => {
    const url = route.request().url();
    if (url.includes("/state")) {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: {} }) });
    } else if (url.includes("/config")) {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ config: {} }) });
    } else if (url.includes("/logs")) {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ logs: {} }) });
    } else if (url.includes("/storage")) {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ storage: {} }) });
    } else if (url.includes("/secrets")) {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    } else {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    }
  });
}

export async function setupAnonymousApp(page: Page) {
  await mockAuthAsAnonymous(page);
}

export async function setupAuthenticatedApp(page: Page) {
  await mockAuthAsAuthenticated(page);
  await mockGitHubConfig(page);
  await mockStats(page);
  await mockPosts(page);
  await mockPages(page);
  await mockTags(page);
  await mockMedia(page);
  await mockThemes(page);
  await mockDeploy(page);
  await mockConfigFile(page);
  await mockPluginApi(page);
}
