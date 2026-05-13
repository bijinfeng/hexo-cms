import { createFileRoute } from "@tanstack/react-router";
import { EditPostPage } from "@hexo-cms/ui/pages/posts-edit";

export const Route = createFileRoute("/posts/$slug")({
  component: EditPostPage,
});
