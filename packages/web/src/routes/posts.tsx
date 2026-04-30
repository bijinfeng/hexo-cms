import { createFileRoute } from "@tanstack/react-router";
import { PostsPage } from "@hexo-cms/ui";
export const Route = createFileRoute("/posts")({ component: PostsPage });
