import { EditPostPage } from "@hexo-cms/ui/pages/posts-edit";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts/$slug")({
  component: EditPostPage,
});
