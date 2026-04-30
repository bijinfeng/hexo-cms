import { createFileRoute } from "@tanstack/react-router";
import { EditPostPage } from "@hexo-cms/ui";

export const Route = createFileRoute("/posts/$slug")({
  component: EditPostPage,
});
