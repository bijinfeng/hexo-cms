import { createFileRoute } from "@tanstack/react-router";
import { PostsPage } from "@hexo-cms/ui/pages/posts";

export const Route = createFileRoute("/posts")({
  component: PostsPage,
});
