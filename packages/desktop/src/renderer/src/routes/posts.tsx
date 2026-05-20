import { PostsPage } from "@hexo-cms/ui/pages/posts";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/posts")({ component: PostsPage });
