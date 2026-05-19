export const queryKeys = {
  config: ["config"] as const,
  posts: {
    all: ["posts"] as const,
    detail: (path: string) => ["posts", path] as const,
  },
  pages: {
    all: ["pages"] as const,
    detail: (path: string) => ["pages", path] as const,
  },
  tags: ["tags"] as const,
  media: ["media"] as const,
  stats: ["stats"] as const,
  themes: ["themes"] as const,
  deployments: ["deployments"] as const,
};
